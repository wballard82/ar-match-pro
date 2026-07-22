# Claims Register (R3)

Every customer-facing claim maps to verifiable behavior. 'No ERP integration or implementation project required; designed for a lightweight security review' — customer security/procurement/software-approval requirements may still apply. 'Financial files are processed locally in the browser during the core workflow' — proven by the data-boundary suite (no invoice/amount/customer values in any network call; only control-plane destinations). Access-control claims map to Supabase auth + RLS + Edge Functions.
