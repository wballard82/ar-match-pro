# Data Boundary Test Report

Network-instrumented (fetch/XHR/sendBeacon/WebSocket) run of import → match → export on a real customer-derived invoice fixture (2,226 rows). Proven: no invoice numbers, POs, SOs, accounts, customer names, amounts, or file payloads appear in any network request; only Supabase auth/functions destinations are permissible; export stays local; no WebSocket connections. 8/8.

**NOT VALIDATED IN STAGING:** the same capture against the live staging site with real Supabase auth traffic present. Pending the staging E2E.
