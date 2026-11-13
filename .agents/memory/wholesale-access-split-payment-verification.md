---
name: Wholesale access split payment verification
description: Integrity rule for the test-payment plus remainder flow used to grant wholesale access.
---

The wholesale access fee is $5, not $50. Access-request explanatory copy must use the configured fee rather than a hardcoded price.

**Why:** The user explicitly requested $5 after seeing a $50 message.

**How to apply:** Keep the fee, returned store credit and member-facing message consistent. Existing issued payment requests retain their quoted terms; do not silently rewrite amounts already being paid.

The test transaction is part of the wholesale access fee. Only persist its hash after successful on-chain verification, then verify the final transaction against `access fee - verified test amount` in both immediate and background verification paths.

**Why:** The payment UI deducts the test amount from the final amount it asks the user to send. Verifying that remainder against the original full fee leaves valid requests pending forever and forces manual approval.

**How to apply:** Any change to wholesale access payment submission must keep the test endpoint, synchronous final check, and scheduled retry on the same wallet, currency, network, tolerance, and outstanding-amount calculation.

An outdated higher-fee request may be replaced at the current fee only with the
member's explicit confirmation that no payment, including a test payment, was
sent. Treat already issued payment instructions as payment in progress, even
without a submitted transaction hash; preserve those original terms.

**Why:** The user approved protection against older $50 requests remaining
payable after the fee became $5. Money may have been sent before a hash is
recorded, so absence of a transaction hash alone is not enough to permit a reset.

**How to apply:** Warn before showing outdated payment instructions. Retain the
old quote as history and create a distinct replacement atomically; never rewrite
completed payments, credits or an in-progress amount. Bind subsequent payment
actions to the exact request so an old tab cannot target its replacement.