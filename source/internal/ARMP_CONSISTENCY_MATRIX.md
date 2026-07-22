# ARMP Consistency Matrix — R3

| Claim | app | admin | auth pages | migrations | functions | docs |
|---|---|---|---|---|---|---|
| Server authorization required | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mandatory TOTP (AAL2) | ✅ | ✅ | ✅ | ✅ (session_aal) | ✅ (privileged) | ✅ |
| No client-side entitlement | ✅ | ✅ | n/a | n/a | n/a | ✅ |
| No Stripe anywhere | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Financial data local only | ✅ | ✅ (never stores) | n/a | ✅ (no fin tables) | ✅ (no fin data) | ✅ |
| Revocation ≤300 s (not instant) | ✅ | ✅ | n/a | n/a | ✅ | ✅ |
| service_role backend-only | ✅ (absent) | ✅ (absent) | ✅ (absent) | n/a | ✅ (env only) | ✅ |

No contradictions found across the deployable set and documentation.
