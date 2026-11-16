---
name: Wholesale vendor access policy
description: User-defined visibility and submission boundaries for the wholesale vendor portal.
---

Vendors must see only their own wholesale orders and supplier cost prices, never customer sale prices. They can process orders, provide images and add tracking, with updates reflected on the member order.

**Why:** The user requested a restricted supplier fulfilment platform.

**How to apply:** Enforce ownership and field privacy server-side, not only through dashboard presentation.

Vendors and Peps Anonymous Admin must be able to record multiple tracking numbers
on a shipment, with a carrier for each number rather than one carrier for the order.

**Why:** The owner requested multiple tracking numbers in both views and explicitly
chose a separate carrier per number.

**How to apply:** Preserve existing parcel identities and local legs; retain
recipient-only visibility of shared supplier shipment tracking.

Peps Anonymous also needs an Admin workspace that can view all submitted vendor
orders, switch between vendors and manage orders. This must not expand vendor
accounts' access or require staff to impersonate a vendor.

**Why:** The user requested an Admin view of all orders/by vendor and explicitly
chose “Include order management.”

**How to apply:** Reuse existing Admin authentication and fulfilment safeguards.
Keep the vendor domain's Admin API access narrowly scoped to this workspace;
ordinary vendor sessions must never authorize cross-vendor reads or writes.

Wholesale Setup price CSVs must keep supplier cost and customer selling price
separate and support filling missing prices without repricing existing orders.

**Why:** The user explicitly chose “Both cost and selling price” for downloading,
editing and importing the selected supplier's prices.

**How to apply:** Export the full assigned active catalogue, independent of table
filters. Treat blank cells as no change, match stable product IDs within the
selected supplier, preview before applying, and preserve stock and availability.

Supplier payment receipts must retain the submitted supplier-cost breakdown as it
was when recorded. Never reconstruct missing historical receipt detail from a
current shipment, and never include Admin-only member identities in vendor history.

**Why:** A voided payment can be followed by a corrected or resubmitted shipment
using the same submission identity. Reusing its latest detail would rewrite the
meaning of an old receipt and can disclose other shared-order members to a vendor.

**How to apply:** Freeze new receipt details independently of shipment updates,
label older missing detail honestly, and explicitly project vendor-visible fields.
Bind payment review to the reviewed supplier-cost snapshot so resubmission cannot
silently change what an Admin records. Require a reviewed snapshot for every new
allocation; older Admin pages must refresh rather than bypass this financial guard.

Peps Anon Payment supports order-specific supplier-cost corrections, FS3 downloads
for selected submissions regardless of payment status, and reviewed historical
paid confirmations for existing processed/shipped orders. These tools are scoped
to Peps Anon Payment, not a change to customer checkout or payment rules.

**Why:** The owner requested these supplier-accounting controls and clarified
“This is only for the peps anon place.” Existing processed/shipped orders had
already been paid; that is not permission to auto-pay future orders.

**How to apply:** Keep cost corrections separate from selling prices and catalogue
prices. Preserve frozen receipts; require clearing paid evidence before cost
edits. Historical confirmations need an explicit reviewed list, actor and note,
never an invented transaction ID or blockchain verification claim. Downloads
reuse the existing wholesale FS3 format and never submit or mutate orders.

Customer item changes must not silently replace a supplier submission. Admin
must review the old and corrected items, delivery and supplier costs, then confirm
the update. Preserve the original in audit history and leave receipts untouched.

**Why:** After removing an out-of-stock item, the owner approved a review-and-update
flow directly in Peps Anon Payment rather than automatic replacement.

**How to apply:** Recheck the reviewed change at confirmation. Paid submissions
and shipments with started fulfilment, tracking or photos remain protected.

Peps Anon reporting uses product gross profit, not net profit. Show percentage
margin beside estimated product profit, and keep older orders' supplier costs
unchanged when supplier price lists change; only future orders use the new costs.

**Why:** The owner explicitly requested historical profit protection and selected
“Product gross profit” for the revenue/profit reporting tab.

**How to apply:** Use transaction-specific historical values, not current catalogue
costs. Margin is profit divided by product selling price, not markup on cost.
Shipping, fees and overheads remain outside this product-profit measure.

Removing an order from Peps Anon Payment means recalling its supplier submission
from the vendor portal and payment list, not cancelling or deleting the customer order.

**Why:** The user explicitly chose “Remove from vendor and payment” while keeping
the customer order intact.

**How to apply:** Reuse supplier recall and its audit trail, retain historical
receipts, and never bypass active payment allocations. Admin may explicitly
override started fulfilment or vendor photos with a required reason and warning;
preserve customer status/tracking and retain the original supplier evidence in audit history.

**Why the override:** The user approved Admin removal of a shipped supplier
submission from the vendor portal and payment list without changing the customer order.

Admin product-profit estimates must use only sales attributable to that supplier,
not the whole total of every linked or mixed-supplier customer order. Product-only
profit must be labelled as an estimate before shipping, discounts, credits and fees.

**Why:** Shared and mixed-supplier orders can appear in several supplier submissions;
using their full totals repeatedly inflates profit. Product margin is not net profit.

**How to apply:** Keep profit Admin-only, use submitted supplier product costs,
show unavailable rather than inventing missing sales, and preserve negative margins.

Existing vendor accounts, sessions, Telegram events and message history must be
preserved when adding or publishing vendor features.

**Why:** The user explicitly said “Don't delete. I want to add these” when Publish
proposed removing existing vendor tables.

**How to apply:** If Publish proposes unexpected vendor-table deletions, compare
the applied development and production schemas. Restore missing development
definitions and verify the publish diff has no destructive statements; never
approve deletion or overwrite production data.

Telegram connection completion must prove that this attempt's one-time code was
used, rather than infer success from recent chat creation or chat counts.

**Why:** Reconnecting an existing chat preserves its original creation date;
unrelated chat changes can also produce false connection results.

**How to apply:** Scope connection status to the current vendor and account,
stop expired or cancelled attempts, and retain Telegram's required Start/add-bot consent.

Orders become visible to the vendor only when Admin submits them, not automatically when payment is confirmed.

**Why:** The user explicitly chose “When Admin submits them.”

**How to apply:** Keep payment confirmation separate from vendor submission and do not expose unsubmitted historical orders automatically.

Vendor sign-in has its own URL and uses the existing account credentials; the regular member login must not link to or automatically redirect vendors into the portal.

**Why:** The user explicitly requested a separate vendor login URL, then confirmed that it should use existing account credentials.

**How to apply:** Keep vendor entry and return-from-logout inside the dedicated vendor login flow. Enforce vendor access on the server after sign-in; do not add a second password system or expose vendor navigation on the regular member login.

The Peps Anonymous vendor sign-in must also accept the existing backend login,
without displaying an “Admin” label, button or separate login option.

**Why:** The user asked to log in through the vendor page, said “Don't mention
admin,” and confirmed “Use existing backend login.”

**How to apply:** Reuse existing privileged authentication and two-factor
verification; only successful authentication opens the all-vendors workspace.
Never grant elevated access from a username or weaken ordinary vendor isolation.

Vendor notification emails must cover new orders and messages only, not the full
Telegram alert set. Vendors can manage their own notification destination and independently choose either, both or neither email category in Settings.

**Why:** The user explicitly selected “New orders and messages only” rather than matching Telegram alerts, then requested options for vendors to choose their notifications.

**How to apply:** Keep email opt-in and verification independent from Telegram. Do not expand email events to holds, overdue alerts, announcements or security events without approval.

Vendors may change their own sign-in username in Settings only after confirming
their current password. Sign out every vendor session afterwards, keeping the
same supplier ownership, orders, payments and established notification settings.

**Why:** The user requested vendor username changes and explicitly selected
“Require password.”

**How to apply:** Keep this separate from member username changes. Invalidate
username-bound pending verification and login/link codes rather than carrying
them to a renamed identity; preserve established MFA methods and linked chats.

Vendor setup guidance must also be available to existing vendor accounts, not
only during signup. It covers username/password review, payment wallets,
verified email notifications and Telegram linking.

**Why:** The user requested a setup guide especially for an existing vendor,
then approved all those setup steps.

**How to apply:** Reuse the existing Settings actions and saved connection
states. Do not reset existing accounts or silently enable optional notifications.

Shared supplier shipments can combine the same product bought at different
historical costs. Their displayed unit cost may be a rounded weighted average,
not a cost that belongs to any individual member's order.

**Why:** Reusing that average after a quantity change produces incorrect costs
and profit even when the original combined total was correct.

**How to apply:** Preserve order/product-specific commercial costs through
quantity changes and re-locking. Only explicit audited product-cost corrections
justify replacing them; a shipping-only correction does not.
