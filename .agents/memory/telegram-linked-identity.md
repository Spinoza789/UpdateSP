---
name: Linked Telegram identity
description: Website account handles can differ from the Telegram account connected to the bot.
---

Website account usernames may differ from the actual Telegram username linked to
the notification bot. Display these separately; never assume one is
the other or rename an account to match a Telegram lookup.

**Why:** the user explicitly reported that some website usernames differ from
the Telegram accounts connected to the bot and needs to identify the latter.

**How to apply:** resolve the bot identity using the stored private-chat ID,
not a username search. An absent public Telegram username and a failed lookup
are different states. Do not expose bot credentials or alter account/order ownership.

Group-buy organisers, reshippers and shared-order organisers may automatically
see clickable linked Telegram usernames for members they manage, alongside
their website handles.

**Why:** The user requested these three workspaces and explicitly selected
automatic display beside each member, like the Admin customer list.

**How to apply:** Enforce access on the server: group ownership plus membership
or an order; enabled reshipper assignment plus that reshipper's owned order; or
shared-order creator plus current membership. Ordinary shared-order participants
must not gain a contact directory. Recheck access and the linked chat after a
Telegram lookup before returning the contact.

Linked Telegram usernames must appear automatically in Admin customer lists,
without a “Show username” step.

**Why:** the user rejected click-to-reveal and explicitly requested the usernames
be shown directly.

**How to apply:** load the lookup when a linked account row appears; keep explicit
loading, no-public-username and error states rather than guessing from the
website handle.
