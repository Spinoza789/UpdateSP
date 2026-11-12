# Telegram feature implementation plan

Approved approach: extend existing ticket, tracking and notification services, using a shared sent-once ledger. Private COAs remain owner-only. No publishing, live Telegram testing, token changes or Drizzle push.

## Shared setup and feature 1 — unpaid reminders
- Add `telegram_reminders_sent` in startup migrations and Drizzle, plus `reminders` defaults and both website preference panels.
- Share the menu's pending-payment SQL with the hourly reminder query. Exclude pending confirmations; use linked accounts, database-time age and sent-once insertion before transport.
- Add `telegram-reminders.test.ts`: repeated runs send once; paid/deleted/cancelled/young orders and preference-off accounts never send; non-production runs do nothing.
- Register `telegram-payment-reminders`, with 300 ms pacing and a 200-send maximum. Add editable `customer_payment_reminder`.

## Feature 2 — closing soon
- Extend the reminder service with active, visible, non-deleted groups closing within 48 hours, joined linked accounts, and a NOT EXISTS non-deleted-order filter.
- Add tests for duplicates, existing orders, visibility, lifecycle and opt-outs.
- Register `telegram-gb-closing-reminders` every six hours. Add editable `customer_gb_closing_soon`.

## Feature 3 — delivered support shortcuts
- Extend existing parcel and individual tracking notification paths; remove delivered-only suppression while preserving all other terminal gates.
- Add a sent-once individual delivery service and editable `customer_order_delivered`.
- Handle `tc:parcel:<id>` and `tc:order:<id>` before generic ticket callbacks; authenticate linked ownership, then set the existing persistent conversation to subject entry with attached context.
- Test delivered-only buttons, single sends and refusal of another account's objects.

## Feature 4 — published reports
- Existing private COA notifications cover payment/processing/completion, not a group-wide publication broadcast.
- Add notifications only for published public lab reports with an explicit `groupBuyId`; never broadcast private COA request links or match product names.
- Use a registered production-only bounded worker, status preference, sent-once `lab_report` claims and editable `customer_lab_report_published`.
- Test publication approval, explicit group linkage, paid ownership and repeat runs.

## Feature 5 — ticket photos
- Reuse `ticket-attachments.ts` validation and App Storage, including its current allowed image signatures and 20 MB limit.
- Extract reusable ticket-image metadata/message helpers where required. Download only the Telegram file API's validated paths, with byte limits before and during download.
- Linked private chats may attach to an owned mapped ticket or finish the existing awaiting-body flow. Captions become message text; no-caption attachments use the requested placeholder.
- Test photo routing, type/size rejection, unknown chat rejection and orphan-storage cleanup. Keep voice/video/sticker behavior unchanged. Add editable explanatory messages.

## Feature 6 — Admin ticket actions
- Extract the existing website ticket-status mutation into a shared transaction-safe helper, preserving existing member notifications.
- Add Resolve/Close buttons alongside Reply; authorize callback chat before invoking the shared helper. Make repeat status changes idempotent.
- Test authorization, status transitions and one member notification. Add editable acknowledgement templates.

## Feature 7 — daily summary
- Register `telegram-daily-admin-summary`; check the London clock and a daily sent-once claim so DST and multiple instances cannot duplicate the 08:00 message.
- Add `telegramDailySummaryEnabled` default true. Aggregate only counts/ages/error groups; exclude skipped messages; use existing Admin menu URLs.
- Test London winter/summer time, configuration, zero-count wording, deduplication and no names.

## Verification and commit sequence
For each numbered feature: write failing regressions, implement, run its tests, then commit once. Shared setup belongs in feature 1. Run the exact requested Telegram test glob plus ticket/tracking/publication tests after all features. Compare API typecheck diagnostics to the existing 123-error baseline, ignoring shifted line numbers. Do not repair unrelated diagnostics. Report new tables, template keys, scheduler names, configuration keys, and anything deliberately not built.
