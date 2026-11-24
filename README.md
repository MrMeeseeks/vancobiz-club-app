# VancoBiz Club — Referral Engine

A web app for VancoBiz Club, a network of local businesses in North Vancouver, BC. Members send clients to one another, every referral is tracked, and the club can show the business it passes between members.

**Live site:** https://mrmeeseeks.github.io/vancobiz-club-app/

This is Phase 1 (MVP): public member directory, magic-link login, sending and tracking referrals, thank-you notifications, member and admin dashboards with CSV export, a Join the Club form, and English/Farsi with right-to-left support.

## How it's built

| Part | What | Where |
|---|---|---|
| Frontend | Vite + React + TypeScript, static files | GitHub Pages, built by GitHub Actions on every push to `main` |
| Backend | Supabase: Postgres, auth (email link + code), Row Level Security | Supabase free tier |
| Email | Brevo: login emails over SMTP, notifications from Postgres via `pg_net` | Brevo free tier |

There is no server of our own. The browser talks to Supabase with the public "anon" key; Row Level Security in the database decides what each person can read or change. Details: [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

First-time setup of Supabase, email and secrets: **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)**.

## Run locally

Needs Node 20.19+ (or 22.12+).

```bash
npm install
cp .env.example .env      # then fill in the two values from Supabase → Project Settings → API
npm run dev
```

Open http://localhost:5173/vancobiz-club-app/. Without a `.env` the app still runs: the directory shows built-in demo data and a banner says it isn't connected.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run test:db` | Applies all migrations and the seed to an in-memory Postgres (PGlite) and runs 86 checks on Row Level Security and the database functions |

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the database tests, builds the site and publishes it to GitHub Pages. It reads two repo secrets at build time: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Secrets never go in the repo. `.env` is gitignored; `.env.example` shows the shape. The anon key is safe to ship in the website. The `service_role` key must never be used here.

Database changes are not deployed automatically. Add a new numbered file in `supabase/migrations/`, run `npm run test:db`, then paste the file into the Supabase SQL Editor.

Routes use the hash (`/#/join`), so refreshing any page works on GitHub Pages.

## Add a member

**In the app (easiest):** log in as an admin → **Admin → Members → Add member**. Enter the member number, name, business, category and the email they will log in with. They can log in straight away and fill in the rest of their profile.

**From a Join request:** **Admin → Join requests → Approve and add as member**. This creates the member and their login from the request.

**In SQL:**

```sql
with m as (
  insert into public.members (member_number, full_name, business_name, category_id)
  values (18, 'Full Name', 'Business Name', (select id from public.categories where slug = 'florist'))
  returning id
)
insert into public.member_accounts (member_id, login_email, role)
select id, 'their-email@example.com', 'member' from m;
```

To remove a member, set **Status → Inactive** in Admin → Members. They disappear from the directory and lose access, and their past referrals stay in the stats.

To add a category: `insert into public.categories (slug, name_en, name_fa, sort) values ('bakery', 'Bakery', 'نانوایی', 170);`

## Change the theme

All colours, fonts, corner radii and spacing are CSS variables in one file: **`src/theme/theme.css`**. Change a value there and the whole app follows. For example, `--color-gold` is the accent and `--card-gradient` is the membership card.

Layout and component styles are in `src/styles/base.css`. They use only the theme variables and CSS logical properties, so right-to-left works without separate Farsi styles.

## Change the wording or translations

Every string on screen is in `src/i18n/en.json` and `src/i18n/fa.json`, with the same keys in both. Nothing is hard-coded in components. A key missing from the Farsi file falls back to English.

Email wording is in `supabase/migrations/20261120000003_functions.sql` (search for `email_html`).

## Project layout

```
src/
  theme/theme.css        the one file to restyle
  styles/base.css        layout and components
  i18n/                  en.json, fa.json and the tiny t() helper
  lib/api.ts             every call to Supabase
  lib/auth.tsx           login state
  components/            shared UI (member card, referral item, guards)
  pages/public/          directory, member profile, join, login, privacy
  pages/app/             member dashboard, send referral, referrals, profile
  pages/admin/           overview, all referrals, members, join requests
supabase/
  migrations/            schema, email, functions, Row Level Security
  seed.sql               categories and the 17 members (placeholder emails)
scripts/test-db.mjs      database tests
docs/DATA_MODEL.md       tables, rules and how to integrate (Phase 2 API)
```

## Privacy

Referrals contain a third party's personal information, so the app stores only a first name, one contact and a short need. The consent checkbox is required and also enforced by the database. Only the sender, the receiver and admins can see a referral. Notification emails never include client details. Admins can remove a client's data on request (Admin → All referrals → Remove client data) or delete the referral. The CSV export leaves out client names and contacts. There are no analytics or tracking scripts, and the Farsi font is self-hosted.

## Not in Phase 1

Designed for but not built: member perks, a shared events calendar, a monthly email report, and plugging into the VancoBiz super app. See "Phase 2" in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
