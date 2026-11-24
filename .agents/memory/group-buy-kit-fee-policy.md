---
name: Group-buy per-kit fee scope
description: Use the existing product-level kit fee rather than introducing a new group-wide charge.
---

Keep the existing per-product fee-per-kit option. Bulk editing sets the same value on selected group-product links, separate from the existing admin fee; it is not a new group-wide fee.

**Why:** The user withdrew the new-fee request after recognising the existing option, then requested selecting multiple/all products to set that existing fee at once.

**How to apply:** Keep fees group-scoped and use the group currency. Bulk fee configuration must not reprice existing orders; existing paid orders must remain unchanged.

When investigating a missing kit fee, reconcile the amount included in the saved total, not just the saved fee field. Add-ons are exempt under the existing policy, including when merged into the same order. A separately approved historical recovery belongs in the outstanding balance, not in the original payment record.

**Why:** In one live incident, customer edits left nonzero fee snapshots but omitted the fee from the payable total. Simply comparing the snapshot with today's kit count produced wrong recovery amounts and would have charged an exempt add-on.

An Admin-only outstanding balance correction is separate from a supplier-batch purchase. Do not require releasing an ordered batch for a balance-only save. Keep authentication, the money lock, refund and half-kit safeguards, and the supplier lock on mixed or purchase-changing edits.

**Why:** A supplier lock blocked a legitimate collection correction although the products and supplier purchase were unchanged.

Half kits may optionally pay the full kit fee, configured per product rather than
with one group-wide switch. Keep proportional charging as the default.

**Why:** The user explicitly chose a per-product option so a half kit can cost
$3 in fees rather than $1.50, without forcing this rule on every product.

**How to apply:** When enabled, charge per whole or partial kit of that product:
½ or 1 kit costs one fee; 1½ or 2 kits costs two fees. Combine quantities of the
same product before applying this rule. Offer it in Admin, both organiser views
and bulk editing, without repricing existing orders when configuration changes.
