---
name: Wholesale free shipping
description: Approved scope and qualifying subtotal for optional vendor-specific shipping offers.
---

Free-shipping thresholds are optional and separate for each wholesale vendor. Qualify at or above the threshold using product selling-price subtotal before store credits, shipping and fees. In shared orders, combine all members' products from the same vendor; other vendors' products do not contribute.

**Why:** The user selected separate thresholds per vendor, combined vendor subtotal for shared orders, and approved these rules.

**How to apply:** Customer eligibility uses selling-price subtotal. Supplier shipment eligibility also applies the vendor's configured threshold, but against that supplier's product purchase subtotal, combining its shared-member items only. Neither changes onward postage. Preserve supported-destination checks and explicit staff shipping overrides. Blank disables the offer.

Supplier shipping must be zero when the supplier purchase qualifies for free
shipping; do not add the normal shipping rate to the amount owed.

**Why:** The user identified a qualifying supplier order whose customer shipping
was zero but whose supplier balance still included shipping. Product profit must
remain product-only; the error belongs in the supplier shipping charge.

**How to apply:** Freeze the resulting supplier shipping when submitting.
Do not silently reprice historical submissions or paid receipts when settings
change. Existing unpaid submissions may be corrected by an explicit audited
shipping-only save, preserving exact historical product totals, weighted lines,
sales and missing-cost evidence, with no buyer notifications.

Free-shipping notices must use the selected vendor's configured threshold and be hidden when the offer is disabled, rather than advertising $1,000 for every vendor.

**Why:** The user explicitly approved following vendor settings for the wholesale banner.

**How to apply:** Keep promotional amounts tied to vendor configuration; adding a notice does not enable or change shipping offers.
