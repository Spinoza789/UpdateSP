# Uther batch wholesale checkout

**Approved design:** One combined wholesale order per prepared Uther batch. Review current Uther prices, delivery and shipping before placing an unpaid order through existing wholesale checkout/payment. Preserve member orders and payments. Reject missing or ambiguous catalogue matches. Link the new order permanently to the batch; prevent repeat purchases and changes to the committed batch.

**Implementation plan**
1. Add tested batch-product mapping and checkout eligibility rules.
2. Add a protected batch preview endpoint using current wholesale catalogue and vendor shipping configuration.
3. Extend normal order creation with a server-validated batch source. Inside its existing transaction, acquire the group mutex, revalidate the batch/quantities/prices, and atomically record the wholesale order link and commit the batch. Do not change member orders.
4. Add a review dialog to existing batch cards: product quantities/prices, delivery fields, calculated shipping and total, and explicit placement. Navigate to the existing order/payment page; linked cards open that order.
5. Verify mapping, permissions, stale previews, duplicate conversion and unchanged member payments with targeted automated tests. Restart the canonical workflow and inspect the public preview; do not bypass authentication.
