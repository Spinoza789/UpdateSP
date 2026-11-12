# Telegram feature implementation report

## Outcome

All seven approved features are implemented. No deployment, production migration or live Telegram test was performed. The running API was deliberately not restarted, so these bot changes are not activated yet.

| Feature | Existing functionality reused | Added |
| --- | --- | --- |
| 1. Unpaid reminders | The account menu's pending-payment condition, preferences and notification transport | Hourly scan after 24 hours; excludes pending confirmation; once-only ledger; Pay now button; Reminders controls in both website account screens and the bot |
| 2. Closing reminders | Group memberships and configured closing dates | Six-hour scan for active, visible groups closing within 48 hours; skips members with a non-deleted order; once per member/group |
| 3. Delivery support | Tracking refresh, parcel visibility/ownership rules and ticket conversation state | Delivered parcel support buttons; once-only individual/direct wholesale delivery alerts; owned order/group context attached to the new support flow |
| 4. Published reports | Public lab reports, paid-order membership and the separate private COA workflow | Five-minute scan of explicitly group-linked, published public reports; once per report/member; private order COAs remain owner-only |
| 5. Ticket photos | Website image validation, App Storage and ticket attachment metadata | Private-chat image downloads, 20 MiB bounds, tracked-reply ownership checks, captions/placeholders, album photos as separate messages and staff attachment notices |
| 6. Admin ticket actions | Admin-chat authorization and the website ticket status endpoint | Resolve/Close buttons and a shared, row-locked, idempotent status helper used by both entry points; one member notification per actual transition |
| 7. Daily summary | Scheduler registry, Admin recipient logging and dashboard links | One counts-only summary at 08:00 Europe/London, including DST; daily claim; configuration switch; All clear when all counts are zero |

No approved feature was intentionally omitted. The daily summary is built in code, as requested, rather than exposed as an editable message template.

## Database and configuration

Startup migrations add:

- `telegram_reminders_sent`: `kind`, `ref_id`, `username`, `sent_at`; composite primary key on the first three fields. Claims use `INSERT ... ON CONFLICT DO NOTHING` before transport.
- `tickets.order_id`: preserves the owned order context for delivery support.
- `site_config.telegramDailySummaryEnabled`, default string value `"true"`; an existing value is preserved.

Reminder totals in the daily summary use successful transport logs, not claims that subsequently failed. Delivery failures are counted separately.

No `drizzle-kit push` was run. Existing bot-state, processed-update and ticket attachment tables are reused.

## Registered production-only schedulers

All four require `PUBLIC_URL`, use the scheduler registry and respect 300 ms send pacing. The first three cap each run at 200 recipients; the daily summary sends at most one message.

| Scheduler | Interval |
| --- | --- |
| `telegram-payment-reminders` | 1 hour |
| `telegram-gb-closing-reminders` | 6 hours |
| `telegram-lab-report-notifications` | 5 minutes |
| `telegram-daily-admin-summary` | Checks every minute; sends only at 08:00 Europe/London |

## New editable template keys

- `customer_payment_reminder`
- `customer_gb_closing_soon`
- `customer_order_delivered`
- `bot_delivery_problem_denied`
- `customer_lab_report_published`
- `bot_ticket_media_guidance`
- `bot_ticket_media_link_required`
- `bot_ticket_media_unavailable`
- `bot_ticket_media_error`
- `ticket_attachment_notice`
- `customer_ticket_status_changed`
- `bot_admin_ticket_status`
- `bot_admin_ticket_status_unchanged`
- `bot_admin_ticket_missing`

## Verification

- 138 tests passed across 21 Telegram and related attachment, private COA, parcel visibility and tracking regression suites.
- API typecheck was compared with the saved baseline, ignoring line-number shifts: 123 existing diagnostics, no new diagnostics.
- The public website rendered in the preview. Signed-in preference screens were not visually verified; no authentication bypass was added.
- Telegram transport and attachment downloads were mocked. No real bot messages were sent for verification.
- There is one implementation commit for each numbered feature.

Activation requires a separately approved API restart/release and its normal startup migrations. Publishing was not attempted.
