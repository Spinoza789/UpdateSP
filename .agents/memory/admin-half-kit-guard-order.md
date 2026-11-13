---
name: Admin and half-kit guard ordering
description: Why session authentication must precede the shared half-kit mutation guard.
---

Run the scoped admin session/CSRF boundary before half-kit protection, and keep half-kit protection before protected write handlers. Do not fix rejected admin writes by skipping half-kit locks or falling back to a shared secret when 2FA is enabled.

**Why:** The half-kit guard authenticates admin mutation plans with requireAdmin. When mounted first, it cannot see the authenticated session flags yet and rejects valid session-only admins with 401. Read-only previews still work because they do not enter that guard, making a functioning fulfilment board appear to have broken drag-and-drop or routing controls.

**How to apply:** When reads succeed but admin order writes return 401, inspect the complete middleware order before changing UI handlers or order data. Test with real authentication and half-kit middleware together, covering session plus CSRF, expired/missing sessions, and disabled-2FA compatibility. Preserve advisory locks and half-kit financial checks.

An operation must have one owner for its monetary advisory lock. When its service owns a transaction-level lock, do not wrap it in a response-lifetime session lock on another connection; move any wrapper-only financial checks into the locked transaction.

**Why:** PostgreSQL advisory locks are reentrant only within the same session. Separate HTTP-guard and transaction connections can block each other even for one request, and increasing timeouts cannot resolve that dependency.

**How to apply:** Review both middleware and service locking when adding money-changing endpoints. Preserve ownership, half-kit balances and supplier-submission protections inside the transaction rather than removing checks to make the request succeed.
