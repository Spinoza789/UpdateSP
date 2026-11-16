# Completed supplier batches

**Approved scope:** Admin and organiser can manually complete submitted batches, view them separately and reopen mistakes. No member notifications or order/payment/delivery changes.

**Implementation:** Keep the purchasing state and allocations unchanged. Store completion/reopening as durable staff audit events, read separately from purchasing snapshots. Require explicit confirmation and the expected completion version under the existing group lock.

- [x] Add failing database and UI tests for completion/reopening, access and unchanged customer data.
- [x] Add authenticated completion endpoint and completion metadata to staff batch responses.
- [x] Add confirmation controls, Completed badge and separate collapsed Completed section in the shared manager.
- [x] Run focused tests and API build, restart the canonical workflow and inspect preview.

Verification so far: all 80 supplier-batch PostgreSQL tests and 39 UI tests passed;
API production build and diff whitespace checks passed. No production data changed.
Canonical workflow restarted; protected batch endpoint returned 401 and Admin
login rendered normally. Signed-in batch visuals were not verified; both staff
flows were exercised through UI interaction tests. Not published.
