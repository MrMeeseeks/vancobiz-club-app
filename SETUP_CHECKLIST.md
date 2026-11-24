# Setup checklist (what you do by hand)

The site is already live at **https://mrmeeseeks.github.io/vancobiz-club-app/** showing the directory from demo data, with a red "Not connected to Supabase" banner. These steps connect it to a real database. Allow about 30 to 40 minutes. Everything here is on a free tier.

## 1. Create the Supabase project
1. Go to https://supabase.com, sign in, **New project**.
2. Name: `vancobiz-club`. Region: **Canada (Central)**, so client data stays in Canada.
3. Save the database password in your password manager. You won't need it for the app.

## 2. Run the migrations and the seed
In Supabase open **SQL Editor → New query**. For each file below, paste the whole file and press **Run**, in this order:

1. `supabase/migrations/20261120000001_schema.sql`
2. `supabase/migrations/20261120000002_email.sql`
3. `supabase/migrations/20261120000003_functions.sql`
4. `supabase/migrations/20261120000004_rls.sql`
5. `supabase/migrations/20261124000001_survey.sql` (the member survey at `/#/survey`; until this is run, survey answers are not saved)
5. `supabase/seed.sql`

Check: **Table Editor → members** shows 17 rows, and every table shows "RLS enabled".

## 3. Set up email (Brevo)
Supabase's built-in mailer only delivers to your own Supabase team, so members would never get their login link without this.

1. Create a free account at https://www.brevo.com.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**. Use an address you can open (for example the club's email) and click the verification link Brevo sends.
3. **SMTP & API → SMTP**: note the SMTP **login** and create an SMTP **key**.
4. **SMTP & API → API Keys**: create an **API key** (starts with `xkeysib-`).

**Login emails** (Supabase → **Authentication → Emails → SMTP Settings**): enable custom SMTP.

| Field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | your Brevo SMTP login |
| Password | your Brevo SMTP key |
| Sender email | the sender you verified |
| Sender name | `VancoBiz Club` |

**Referral notification emails** (Supabase → SQL Editor). Replace the two values and run:

```sql
select vault.create_secret('xkeysib-YOUR-BREVO-API-KEY', 'brevo_api_key');
update private.settings set value = 'the-sender-you-verified@example.com' where key = 'email_from_address';
```

Until both lines are run, the app works but sends no referral emails (in-app notifications still appear).

## 4. Auth settings
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://mrmeeseeks.github.io/vancobiz-club-app/`
- **Redirect URLs**, add both:
  - `https://mrmeeseeks.github.io/vancobiz-club-app/`
  - `http://localhost:5173/vancobiz-club-app/` (for local development)

Supabase → **Authentication → Sign In / Providers → Email**: keep **Email** enabled and keep **Confirm email** ON. The database only trusts confirmed emails.

Supabase → **Authentication → Emails → Templates**. Edit **both** "Magic Link" and "Confirm signup" (Supabase uses "Confirm signup" the first time each member logs in). Paste this as the body of each, so the email carries the 6-digit code as well as the link:

```html
<h2>VancoBiz Club login</h2>
<p><a href="{{ .ConfirmationURL }}">Tap here to log in</a></p>
<p>Or type this code on the login page: <strong>{{ .Token }}</strong></p>
<p dir="rtl">برای ورود روی لینک بالا بزنید یا این کد را در صفحه ورود وارد کنید: <strong>{{ .Token }}</strong></p>
```

The code matters: on phones the link often opens in the mail app's own browser, where the login can't complete. The code always works.

## 5. Add the repo secrets
Supabase → **Project Settings → API** (or **API Keys**): copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` / secret key in this app.

In a terminal (each command prompts you to paste the value):

```powershell
gh secret set VITE_SUPABASE_URL --repo MrMeeseeks/vancobiz-club-app
```

```powershell
gh secret set VITE_SUPABASE_ANON_KEY --repo MrMeeseeks/vancobiz-club-app
```

Then rebuild the site with the secrets:

```powershell
gh workflow run "Test and deploy to GitHub Pages" --repo MrMeeseeks/vancobiz-club-app
```

After about a minute the red banner disappears from the live site.

## 6. Replace the placeholder emails
The seed uses `member01@example.com` … `member17@example.com`, plus `admin@example.com` for an admin login that isn't a listed member. No email is ever sent to an `@example.com` address.

First, your own admin login (SQL Editor):

```sql
update public.member_accounts set login_email = 'your-real-email@example.com' where login_email = 'admin@example.com';
update public.member_accounts set login_email = 'amins-real-email@example.com' where login_email = 'member01@example.com';
```

Emails must be lowercase. Then log in on the live site with your email and set the rest in **Admin → Members → Edit → Login email**, or keep going in SQL.

If Salar the builder **is** member 06 (Salar Eskandari), delete the extra admin and promote member 06 instead:

```sql
delete from public.member_accounts where login_email = 'admin@example.com';
update public.member_accounts set role = 'admin', login_email = 'your-real-email@example.com' where login_email = 'member06@example.com';
```

## 7. Small edits in the repo
- `src/config.ts`: set `CLUB_CONTACT_EMAIL` (shown on the privacy page). Commit and push; the site redeploys itself.

## 8. Try it end to end
I could not test these parts without a real Supabase project, so please run through them once:

- [ ] Log in with your admin email: the link works, and so does the 6-digit code.
- [ ] Temporarily set two member accounts to two inboxes you own. As member A, send a referral to member B.
- [ ] Member B gets the email, sees the referral, clicks Accept → Mark contacted → Mark won with a value.
- [ ] Member A gets the thank-you email and sees the thank-you on their dashboard.
- [ ] Member A cannot see referrals between other members.
- [ ] Admin → Overview shows the totals; Download CSV works.
- [ ] Submit the public Join form; it appears under Admin → Join requests; approve it.
- [ ] Switch to فارسی and check a few pages.

## 9. Invite the members
Send each member the site address and tell them which email to log in with. There are no passwords: they enter their email on **Member login** and get a link and code. Ask each to fill in their profile (Farsi name, real business name, bio, phone, logo).

## Later
- **Custom domain**: GitHub repo → Settings → Pages → Custom domain. Then change `base` in `vite.config.ts` to `'/'`, and update the Site URL and Redirect URLs in step 4 and `site_url` in `private.settings`.
- **Free-tier note**: Supabase pauses free projects after about a week with no activity. Opening the site or dashboard wakes it; restore it from the Supabase dashboard if it was paused.
