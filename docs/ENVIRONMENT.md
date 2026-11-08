# Environment configuration

## This build (Claude artifact)

The published artifact needs **no environment variables and no external services**. Everything runs in the viewer:

| Capability | Used for | Fallback when unavailable |
|---|---|---|
| `db` | Shared, durable storage of every change (completions, registrations, schedules, scenarios…) | Browser-local storage, with a visible "this browser only" badge |
| `user` | Real viewer identity shown on My Account and recorded on audit entries | Not shown |
| `sample` | "Ask the Academy" summaries on the search page (approved content only) | Button hidden |
| `assets` | Video review uploads, registration documents (editors inside Claude) | Metadata recorded, file not stored, explained in the UI |
| `downloads` | PDF exports, CSV exports, ICS calendar, certificates | Browser download, or a copy box |

## Hosted deployment (Next.js + PostgreSQL)

Create `.env` from this list. Never commit real values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `AUTH_SECRET`, `AUTH_URL` | Session signing for the auth provider (email + password, magic link or SSO) |
| `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | Transactional email (registration confirmations, schedule changes) |
| `SMS_PROVIDER_SID`, `SMS_PROVIDER_TOKEN`, `SMS_FROM` | Optional SMS alerts (rainouts) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Hosted checkout for registration fees, donations, sponsorships; never store card numbers |
| `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_KEY`, `OBJECT_STORAGE_SECRET` | Private video and document storage with signed URLs |
| `WEATHER_API_KEY` | Optional forecast display on Fields & weather (never auto-cancels) |
| `PLATFORM_BASE_DOMAIN` | Base domain for league subdomains (`dvyaa.<base>`) |
| `BACKGROUND_CHECK_PROVIDER_URL` | Link-out only; GamePlanIQ stores status, never reports |

Secrets are read on the server only. The browser bundle never contains them.
