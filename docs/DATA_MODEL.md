# Data model and access rules

Everything lives in one Supabase (Postgres) project. The SQL is in `supabase/migrations/`; this file explains it and how another app can integrate with it.

## Tables (schema `public`)

| Table | Purpose | Who can read | Who can write |
|---|---|---|---|
| `categories` | Bilingual lookup: `slug`, `name_en`, `name_fa`, `sort` | Everyone | Admins |
| `members` | Public profile of each business: number, names, business, category, bios, logo, public contact, `status` | Everyone sees `active` members; admins see all | A member edits their own profile fields; admins edit anyone. Number and status only via `admin_save_member()` |
| `member_accounts` | Who may log in: `login_email`, `role` (`member` / `admin`), `member_id` (null for an admin who isn't a listed member) | Nobody directly. Use `my_account()` or `admin_list_accounts()` | Only via `admin_save_member()` |
| `referrals` | One client introduction from `sender_id` to `receiver_id` | The sender, the receiver, admins | Insert as yourself; status only via `set_referral_status()`; delete by admins |
| `referral_events` | Audit trail: every status change with who and when | Same as the referral | Database only |
| `notifications` | In-app notices (`referral_received`, `referral_won`) | The member they belong to | Member may set `read_at` |
| `join_requests` | Submissions from the public Join form | Admins | Anyone may insert; admins approve, reject, delete |

`private.settings` holds `site_url`, `email_from_address`, `email_from_name`. The `private` schema is not exposed through the API.

### Referral fields
`client_first_name`, `client_contact`, `need` (max 280), `notes` (max 500), `consent_confirmed` (must be true), `consent_at`, `status`, `deal_value_cad`, `created_at`, `updated_at`, `responded_at`, `closed_at`, `client_redacted_at`.

Deliberately not stored: last names, ID numbers, immigration status, financial details.

### Referral status
```
pending ──► accepted ──► contacted ──► won (optional deal_value_cad)
   │            │             └──────► lost
   │            ├──► won
   │            └──► lost
   └──► declined
```
Only the receiving member (or an admin) can move a referral, and only along these arrows. `declined`, `won` and `lost` are final.

## How login maps to a member
Supabase Auth proves that someone owns an email address (magic link or 6-digit code). The database then looks for a `member_accounts` row whose `login_email` equals that **confirmed** email. If there is one and the member is active, that is who they are. If not, they are logged in but can see nothing beyond the public directory. Changing a member's `login_email` is all it takes to move a login to a new address.

## Functions the app calls (RPC)

| Function | Who | What |
|---|---|---|
| `my_account()` | logged in | Your role and member profile |
| `my_stats()` | member | Sent, received, won, value |
| `set_referral_status(p_referral_id, p_status, p_deal_value)` | receiver, admin | Move a referral along the status flow |
| `admin_month_report(p_month)` | admin | Totals, top referrers and category-to-category flow for `'YYYY-MM'` (Vancouver time) |
| `admin_list_accounts()` | admin | Login emails, roles, last sign-in |
| `admin_save_member(...)` | admin | Create or update a member and their login |
| `approve_join_request(p_request_id, p_member_number, p_category_id)` / `reject_join_request(p_request_id)` | admin | Review a join request |
| `redact_referral_client(p_referral_id)` | admin | Privacy: wipe the client's details, keep the numbers |

Month report definitions: `total`, `accepted`, `declined`, `pending` count referrals **created** in the month; `won`, `lost`, `won_value` count referrals **closed** in the month.

## Emails
Triggers on `referrals` and `join_requests` call `private.send_email()`, which posts to Brevo's API using the `pg_net` extension. The API key is read from Supabase Vault (`brevo_api_key`). Emails never contain client details and are never sent to `@example.com` addresses. If email isn't configured or fails, the referral still saves.

| Event | Email to |
|---|---|
| Referral sent | The receiving member |
| Referral marked won | The sending member (thank-you) |
| Join request submitted | All admins |

## Security model
- Row Level Security is on for every table, and each role is granted only the operations it needs. The anon key in the website can therefore do no more than a public visitor.
- All state-changing rules (who may accept, valid status moves, consent required, new referrals always start `pending`) are enforced in the database, not only in the UI.
- `npm run test:db` checks these rules against a real Postgres engine on every push.

## Phase 2: integrating with the VancoBiz super app
Supabase exposes these tables and functions as a REST API automatically, under the same Row Level Security. No extra backend is needed.

Read the public directory (no login, anon key only):

```
GET https://<project>.supabase.co/rest/v1/members?select=member_number,full_name,business_name,category_id&order=member_number
apikey: <anon key>
```

Call a function as a logged-in member:

```
POST https://<project>.supabase.co/rest/v1/rpc/my_stats
apikey: <anon key>
Authorization: Bearer <the member's Supabase access token>
```

For a trusted server-to-server integration, use the `service_role` key **on the server only**. It bypasses Row Level Security, so it must never reach a browser or this repo.

Suggested shapes for the planned Phase 2 features, so they slot in without changing existing tables:

| Feature | Sketch |
|---|---|
| Member perks | `perks (id, member_id → members, title_en, title_fa, details_en, details_fa, valid_until, active)`; public read, owner write |
| Events calendar | `events (id, title_en, title_fa, starts_at, ends_at, location, created_by → members)`; member read, admin write |
| Monthly email report | A scheduled job (Supabase `pg_cron`) that calls `admin_month_report()` and `private.email_member()` for each active member |
| Super app link | Add `external_ref text` to `members` to map a member to their super-app record |

Stable identifiers to rely on: `members.id` (uuid), `members.member_number`, `categories.slug`, `referrals.id`.
