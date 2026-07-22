# Deployment

STAGING FIRST. Frontend: upload contents of deploy/ (incl. deploy/auth/) to the Netlify staging root; never upload tests/, supabase/seed/, source/, generators/. Backend: run the approval-gated GitHub Actions — staging-migrate then staging-deploy-functions (each requires typing the staging ref vjxdqmujxnmlfvnksvpy to confirm), after you set the repo + function secrets. Verify via staging-tests. Production domains untouched until explicit approval. CSP allows only the exact staging Supabase origin.
