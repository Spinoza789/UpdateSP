# Record payment summary

**Approved scope:** Add selected-order supplier product costs, supplier shipping,
highlighted total owed, product selling price, estimated product profit and margin
at the bottom of Record payment. Keep USD totals separate from crypto sent.

**Architecture:** Read existing ledger snapshot fields only. Sum monetary values
as integer cents, use weighted aggregate margin, and show Unavailable if any
selected order lacks a required historical value. Reuse the summary on form and
confirmation. Do not change the payment payload, amount input or notification paths.

- [x] Add failing aggregation and payment-dialog tests.
- [x] Implement snapshot-only totals and a responsive footer summary.
- [x] Run focused tests, inspect preview and record verification limitations.

Verification: five aggregation tests and all 41 Admin payment UI tests passed.
Whitespace checks passed. Canonical workflow restarted, the new Vite module
returned 200 and Admin login rendered normally. The signed-in modal was tested
through interaction tests, not visually verified behind authentication.
Frontend-only change; full production build was not run. Not published.
