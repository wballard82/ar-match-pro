# ARMP Data-Boundary Test Report — R3

## Method
The packaged `deploy/app.html` boots in jsdom with `fetch`, `XMLHttpRequest`, `sendBeacon`, and `WebSocket` instrumented. A real customer-derived invoice fixture (2,226 rows) is imported through the template adapter, a bank payment is created, matching runs, and export is invoked. Every network attempt is captured and scanned.

## Result <span class="badge ok">8 / 8 PASS (local)</span>
- No network call carries invoice numbers, POs, SOs, accounts, customer names, or amounts.
- Only Supabase auth/functions destinations are permissible; no other origins attempted.
- No spreadsheet/base64 file payload in any request body; no WebSocket connections; export stayed local.

## Label
Local jsdom proof of the frontend's behavior. The staging data-boundary run (same instrumentation against the live site) is part of the acceptance battery and is **NOT YET RUN**.
