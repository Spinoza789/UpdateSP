---
name: Organiser payment evidence
description: Meaning of payment timestamps and sender identities shown to organisers.
---

Organiser transaction details use the actual blockchain payment time, not the time a TXID was submitted, an order was created, or staff marked it paid. Show the timezone explicitly.

**Why:** The user chose blockchain payment time to locate specific transactions in their wallet payment history.

**How to apply:** Never manufacture a historical payment time from other timestamps. If chain evidence is unavailable, say so. Keep these lookups read-only and separate from payment verification. A token's sending wallet may differ from an Ethereum transaction initiator or Solana fee payer; label those roles separately and do not infer a member's personal wallet.
