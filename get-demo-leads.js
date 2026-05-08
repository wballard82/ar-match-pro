// netlify/functions/get-demo-leads.js
//
// Fetches verified Netlify Forms submissions for the AR Match Pro "demo-leads" form
// and returns them as a normalized JSON array for the admin panel.
//
// ── SETUP ──────────────────────────────────────────────────────────────────────
// Set these two environment variables in your Netlify site:
//   Netlify Dashboard → Site → Site configuration → Environment variables
//
//   NETLIFY_API_TOKEN
//     Your personal Netlify API access token.
//     Generate at: https://app.netlify.com/user/applications#personal-access-tokens
//     Scope: full access is fine; read-only to Forms is sufficient.
//
//   NETLIFY_DEMO_FORM_ID
//     The unique ID of the "demo-leads" form in your Netlify account.
//     How to find it:
//       1. Go to Netlify Dashboard → your site → Forms
//       2. Click on the "demo-leads" form
//       3. The URL will look like:
//            https://app.netlify.com/sites/{site-name}/forms/{FORM_ID}
//       4. Copy the FORM_ID from the URL.
//     Alternatively, list all forms via API:
//       GET https://api.netlify.com/api/v1/sites/{SITE_ID}/forms
//       with Authorization: Bearer YOUR_TOKEN
//
// ── SECURITY NOTE ──────────────────────────────────────────────────────────────
// The API token is read exclusively from process.env inside this server-side
// function. It is NEVER included in any response body or exposed to the browser.
// ───────────────────────────────────────────────────────────────────────────────

'use strict';

// Use built-in fetch (available in Node 18+, which Netlify Functions use by default).
// If your Netlify site uses Node 16, install node-fetch and require it here.

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

// Normalize a raw Netlify Forms submission into the AR Match Pro lead schema.
// Netlify wraps field values inside submission.data — field names match the
// <input name="..."> attributes in the hidden form in index.html.
function normalizeSubmission(sub) {
  const d = sub.data || {};

  // fullName: prefer the 'fullName' field; fall back to 'name'
  const fullName = (d.fullName || d.name || '').trim();

  // Derive firstName / lastName from fullName if not already split
  const nameParts = fullName.split(/\s+/);
  const firstName = (d.firstName || nameParts[0] || '').trim();
  const lastName  = (d.lastName  || nameParts.slice(1).join(' ') || '').trim();

  // email: prefer workEmail, then email
  const email = (d.workEmail || d.email || '').trim().toLowerCase();

  // signupAt is the ISO timestamp we embedded in the form payload;
  // fall back to Netlify's own created_at timestamp
  const signupAt    = d.signupAt    || sub.created_at || new Date().toISOString();
  const demoStartAt = d.demoStartAt || signupAt;
  const expiresAt   = d.expiresAt   || (() => {
    const exp = new Date(signupAt);
    exp.setDate(exp.getDate() + 7);
    return exp.toISOString();
  })();

  return {
    // Identifiers
    id:            'netlify_' + sub.id,
    netlifyId:     sub.id,
    netlifyVerified: true,

    // Name fields
    fullName,
    firstName,
    lastName,
    name: fullName,           // legacy compat

    // Contact
    email,
    workEmail: email,         // alias
    phone:     (d.phone  || '').trim(),

    // Company / role
    company:       (d.company   || '').trim(),
    jobTitle:      (d.jobTitle  || '').trim(),

    // Product qualification
    erp:           (d.erp           || '').trim(),
    invoiceVolume: (d.invoiceVolume  || '').trim(),

    // Demo lifecycle
    signupDate:    signupAt,
    signupAt,
    demoStartAt,
    demoStartDate: demoStartAt,
    expiresAt,
    demoExpiration: expiresAt,
    demoStatus:    d.demoStatus || 'Demo Active',

    // Provenance
    source:        (d.source || 'Free Demo') + ' · Netlify ✓',

    // Admin state (default — admin can override locally)
    contacted:     false,
    converted:     false,
    notes:         '',
  };
}

exports.handler = async function(event) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Read required environment variables ────────────────────────────────────
  const token  = process.env.NETLIFY_API_TOKEN;
  const formId = process.env.NETLIFY_DEMO_FORM_ID;

  if (!token) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'NETLIFY_API_TOKEN is not set. Add it in Netlify → Site configuration → Environment variables.',
      }),
    };
  }

  if (!formId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'NETLIFY_DEMO_FORM_ID is not set. Find it in Netlify → Forms → demo-leads form URL and add it to environment variables.',
      }),
    };
  }

  // ── Fetch all verified submissions (paginated up to 1000) ──────────────────
  // Netlify Forms API returns up to 100 per page by default; per_page=1000 is
  // the documented maximum and sufficient for MVP lead volumes.
  const apiUrl = `${NETLIFY_API_BASE}/forms/${formId}/submissions?per_page=1000&page=1`;

  let raw;
  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,   // token stays server-side only
        'Content-Type':  'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Netlify API error', res.status, body);
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Netlify API returned ${res.status}. Check NETLIFY_API_TOKEN and NETLIFY_DEMO_FORM_ID.`,
        }),
      };
    }

    raw = await res.json();
  } catch (fetchErr) {
    console.error('Fetch to Netlify API failed:', fetchErr);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not reach Netlify API: ' + fetchErr.message }),
    };
  }

  // ── Normalize submissions ──────────────────────────────────────────────────
  if (!Array.isArray(raw)) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unexpected response shape from Netlify API (not an array).' }),
    };
  }

  const leads = raw.map(normalizeSubmission);

  // Sort newest first (matches armp_demo_leads convention)
  leads.sort(function(a, b) {
    return new Date(b.signupAt) - new Date(a.signupAt);
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // Allow the browser on the same Netlify domain to call this
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
    body: JSON.stringify(leads),
  };
};
