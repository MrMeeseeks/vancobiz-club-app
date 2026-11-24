// Applies every migration + the seed to an in-memory Postgres (PGlite) and checks that
// Row Level Security and the RPC functions behave. Run with: npm run test:db
//
// Supabase-only pieces (auth schema, roles, Vault, pg_net) are replaced by small stand-ins
// below, so this tests OUR SQL, not Supabase itself.
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const db = new PGlite()

const STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
    email_confirmed_at timestamptz, last_sign_in_at timestamptz);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema vault; create table vault.decrypted_secrets (name text, decrypted_secret text);
  create schema net; create table net.sent (url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb, headers jsonb) returns bigint language sql
    as $$ insert into net.sent values (url, body, headers) returning 1::bigint $$;
`

let passed = 0
let failed = 0
function ok(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok    ${name}`) }
  else { failed++; console.log(`  FAIL  ${name} ${detail}`) }
}
async function as(userId, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false); set role ${userId ? 'authenticated' : 'anon'};`)
  try { return await fn() } finally { await db.exec('reset role;') }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows
async function denied(name, fn) {
  try { const r = await fn(); ok(name, false, `(expected an error, got ${JSON.stringify(r)?.slice(0, 120)})`) }
  catch { ok(name, true) }
}

console.log('Applying migrations…')
await db.exec(STUBS)
const dir = join(root, 'supabase', 'migrations')
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(dir, f), 'utf8'))
  console.log(`  applied ${f}`)
}
await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'))
console.log('  applied seed.sql\n')

// ---- Fixtures: give four people real-looking emails and logins ----
const login = async (email, confirmed = true) =>
  (await rows(`insert into auth.users (email, email_confirmed_at) values ($1, ${confirmed ? 'now()' : 'null'}) returning id`, [email]))[0].id
const memberId = async (n) => (await rows('select id from public.members where member_number = $1', [n]))[0].id
await db.exec(`
  update public.member_accounts set login_email = 'amin@club.test' where login_email = 'member01@example.com';
  update public.member_accounts set login_email = 'navid@club.test' where login_email = 'member05@example.com';
  update public.member_accounts set login_email = 'salar.e@club.test' where login_email = 'member06@example.com';
  update public.member_accounts set login_email = 'sia@club.test' where login_email = 'member08@example.com';
  update public.member_accounts set login_email = 'builder@club.test' where login_email = 'admin@example.com';
  insert into vault.decrypted_secrets values ('brevo_api_key', 'test-key');
  update private.settings set value = 'club@club.test' where key = 'email_from_address';
`)
const amin = await login('amin@club.test')          // admin + member 1
const navid = await login('Navid@Club.test')        // member 5 (case-insensitive match)
const salarE = await login('salar.e@club.test')     // member 6
const sia = await login('sia@club.test')            // member 8
const builder = await login('builder@club.test')    // admin, not a member
const stranger = await login('stranger@else.test')  // logged in, not on the list
const unconfirmed = await login('member02@example.com', false) // email matches but NOT confirmed
const [m1, m5, m6, m8] = [await memberId(1), await memberId(5), await memberId(6), await memberId(8)]

console.log('Seed')
ok('17 members seeded', (await rows('select count(*)::int n from public.members'))[0].n === 17)
ok('18 accounts (17 members + 1 admin-only)', (await rows('select count(*)::int n from public.member_accounts'))[0].n === 18)
ok('2 admins', (await rows(`select count(*)::int n from public.member_accounts where role = 'admin'`))[0].n === 2)

console.log('Public visitor (anon)')
await as(null, async () => {
  ok('sees the 17 active members', (await rows('select id from public.members')).length === 17)
  ok('sees categories', (await rows('select id from public.categories')).length === 16)
  await denied('cannot read member_accounts (login emails)', () => rows('select * from public.member_accounts'))
  await denied('cannot read referrals', () => rows('select * from public.referrals'))
  await denied('cannot read join_requests', () => rows('select * from public.join_requests'))
  await denied('cannot read private.settings', () => rows('select * from private.settings'))
  await denied('cannot update a member', () => rows(`update public.members set full_name = 'x' returning id`))
  await denied('cannot call my_stats()', () => rows('select public.my_stats()'))
  await denied('cannot call admin_month_report()', () => rows(`select public.admin_month_report('2026-11')`))
  await rows(`insert into public.join_requests (business_name, contact_name, category_text, email, reason)
              values ('Lonsdale Bakery', 'Roya', 'Bakery', 'Roya@Bakery.test', 'Meet local owners')`)
  ok('can submit a join request', true)
  await denied('cannot set a join request status directly', () =>
    rows(`insert into public.join_requests (business_name, contact_name, email, status) values ('x', 'y', 'z@z.test', 'approved')`))
})
await db.exec(`update public.members set status = 'inactive' where member_number = 17`)
await as(null, async () => ok('does not see an inactive member', (await rows('select id from public.members')).length === 16))
await db.exec(`update public.members set status = 'active' where member_number = 17`)

console.log('Identity')
await as(navid, async () => {
  const acc = (await rows('select public.my_account() a'))[0].a
  ok('member login resolves to their member row', acc?.member?.member_number === 5 && acc.role === 'member')
  ok('member is not admin', (await rows('select public.is_admin() v'))[0].v === false)
})
await as(builder, async () => {
  const acc = (await rows('select public.my_account() a'))[0].a
  ok('admin-only login: admin, no member', acc?.role === 'admin' && acc.member === null)
})
await as(stranger, async () => {
  ok('unknown email gets no account', (await rows('select public.my_account() a'))[0]?.a == null)
  ok('unknown email sees no referrals', (await rows('select id from public.referrals')).length === 0)
  await denied('unknown email cannot send a referral', () =>
    rows(`insert into public.referrals (sender_id, receiver_id, client_first_name, client_contact, need, consent_confirmed)
          values ($1, $2, 'A', '604-555-0000', 'x', true)`, [m5, m6]))
})
await as(unconfirmed, async () =>
  ok('unconfirmed email is NOT treated as that member', (await rows('select public.current_member_id() v'))[0].v === null))

console.log('Sending a referral')
const insertReferral = (sender, receiver, extra = {}) => rows(
  `insert into public.referrals (sender_id, receiver_id, client_first_name, client_contact, need, notes, consent_confirmed, status, deal_value_cad)
   values ($1, $2, 'Maryam', '604-555-0101', 'First-time buyer, 2-bed condo', $3, $4, $5, $6) returning *`,
  [sender, receiver, extra.notes ?? null, extra.consent ?? true, extra.status ?? 'pending', extra.deal ?? null])
let ref
await as(salarE, async () => {
  await denied('consent = false is rejected', () => insertReferral(m6, m5, { consent: false }))
  await denied('cannot send as someone else', () => insertReferral(m8, m5))
  await denied('cannot refer to yourself', () => insertReferral(m6, m6))
  ref = (await insertReferral(m6, m5, { status: 'won', deal: 99999 }))[0]
  ok('referral created', Boolean(ref?.id))
  ok('forged status/deal value are reset to pending/null', ref.status === 'pending' && ref.deal_value_cad === null)
  await denied('sender cannot update the referral directly', () =>
    rows(`update public.referrals set status = 'won' where id = $1 returning id`, [ref.id]))
  await denied('sender cannot change status via RPC', () => rows(`select public.set_referral_status($1, 'accepted')`, [ref.id]))
  await denied('sender cannot delete the referral', async () => {
    const r = await rows('delete from public.referrals where id = $1 returning id', [ref.id])
    if (r.length === 0) throw new Error('nothing deleted')
    return r
  })
})
ok('receiver got an in-app notification', (await rows(`select 1 from public.notifications where member_id = $1 and kind = 'referral_received'`, [m5])).length === 1)
const sent = async () => (await rows('select body from net.sent')).map((m) => m.body)
const mail1 = (await sent()).filter((b) => b.to[0].email === 'navid@club.test')
ok('both admins were emailed about the join request', (await sent()).filter((b) => b.subject.startsWith('New request to join')).length === 2)
ok('receiver was emailed', mail1.length === 1 && mail1[0].subject.includes('Salar Eskandari') && mail1[0].sender.email === 'club@club.test')
ok('email holds no client details', !JSON.stringify(mail1[0]).includes('Maryam') && !JSON.stringify(mail1[0]).includes('604-555'))

console.log('Who can see it')
await as(navid, async () => ok('receiver sees it', (await rows('select id from public.referrals')).length === 1))
await as(salarE, async () => ok('sender sees it', (await rows('select id from public.referrals')).length === 1))
await as(sia, async () => {
  ok('a third member does NOT see it', (await rows('select id from public.referrals')).length === 0)
  ok('a third member does NOT see its events', (await rows('select id from public.referral_events')).length === 0)
  ok('a third member does NOT see its notifications', (await rows('select id from public.notifications')).length === 0)
  await denied('a third member cannot change its status', () => rows(`select public.set_referral_status($1, 'accepted')`, [ref.id]))
})
await as(amin, async () => ok('admin sees it', (await rows('select id from public.referrals')).length === 1))
await as(builder, async () => ok('admin-only login sees it', (await rows('select id from public.referrals')).length === 1))

console.log('Status flow')
await as(navid, async () => {
  await denied('cannot jump pending -> won', () => rows(`select public.set_referral_status($1, 'won', 5000)`, [ref.id]))
  await rows(`select public.set_referral_status($1, 'accepted')`, [ref.id])
  await denied('deal value only allowed with won', () => rows(`select public.set_referral_status($1, 'contacted', 100)`, [ref.id]))
  await rows(`select public.set_referral_status($1, 'contacted')`, [ref.id])
  await rows(`select public.set_referral_status($1, 'won', 12500)`, [ref.id])
  const r = (await rows('select status, deal_value_cad, closed_at from public.referrals where id = $1', [ref.id]))[0]
  ok('accepted -> contacted -> won with value', r.status === 'won' && Number(r.deal_value_cad) === 12500 && r.closed_at !== null)
  await denied('a closed referral cannot change again', () => rows(`select public.set_referral_status($1, 'lost')`, [ref.id]))
  ok('4 audit events recorded', (await rows('select id from public.referral_events where referral_id = $1', [ref.id])).length === 4)
})
ok('thank-you notification for the sender', (await rows(`select 1 from public.notifications where member_id = $1 and kind = 'referral_won'`, [m6])).length === 1)
const mail2 = (await sent()).filter((b) => b.to[0].email === 'salar.e@club.test')
ok('thank-you email to the sender', mail2.length === 1 && mail2[0].subject.includes('Navid Hakimi'))
await as(salarE, async () => {
  await rows('update public.notifications set read_at = now() where member_id = $1', [m6])
  ok('member can mark own notification read', (await rows('select 1 from public.notifications where read_at is not null')).length === 1)
  await denied('member cannot rewrite a notification', () => rows(`update public.notifications set kind = 'referral_received' returning id`))
})

console.log('Stats and reports')
await as(salarE, async () => {
  const s = (await rows('select public.my_stats() s'))[0].s
  ok('sender stats', s.sent === 1 && s.sent_won === 1 && Number(s.value_generated) === 12500 && s.received === 0)
  await denied('member cannot run the admin report', () => rows(`select public.admin_month_report(to_char(now(), 'YYYY-MM'))`))
  await denied('member cannot list accounts', () => rows('select * from public.admin_list_accounts()'))
})
await as(navid, async () => {
  const s = (await rows('select public.my_stats() s'))[0].s
  ok('receiver stats', s.received === 1 && s.won_received === 1 && Number(s.value_received) === 12500)
})
await as(amin, async () => {
  const rep = (await rows(`select public.admin_month_report(to_char(now() at time zone 'America/Vancouver', 'YYYY-MM')) r`))[0].r
  ok('admin month report totals', rep.total === 1 && rep.won === 1 && Number(rep.won_value) === 12500)
  ok('top referrer is Salar Eskandari', rep.top_referrers[0]?.full_name === 'Salar Eskandari' && rep.top_referrers[0].sent === 1)
  ok('category flow has immigration -> real estate', rep.flow.length === 1 && rep.flow[0].count === 1 && Number(rep.flow[0].value) === 12500)
  ok('admin lists accounts', (await rows('select * from public.admin_list_accounts()')).length === 18)
})

console.log('Profiles')
await as(navid, async () => {
  await rows(`update public.members set bio_en = 'Hello' where id = $1`, [m5])
  ok('member edits own bio', (await rows('select bio_en from public.members where id = $1', [m5]))[0].bio_en === 'Hello')
  const other = await rows(`update public.members set bio_en = 'hacked' where id = $1 returning id`, [m6])
  ok('member cannot edit another member', other.length === 0)
  await denied('member cannot change own member number', () => rows('update public.members set member_number = 99 where id = $1', [m5]))
  await denied('member cannot change own status', () => rows(`update public.members set status = 'inactive' where id = $1`, [m5]))
  await denied('member cannot save members via RPC', () =>
    rows(`select public.admin_save_member(null, 50, 'X', 'Y', null, 'x@y.test')`))
})

console.log('Admin tools')
await as(amin, async () => {
  const reqs = await rows('select * from public.join_requests')
  ok('admin reads join requests', reqs.length === 1 && reqs[0].email === 'roya@bakery.test' && reqs[0].status === 'new')
  const cat = (await rows(`select id from public.categories where slug = 'restaurant'`))[0].id
  const newId = (await rows('select public.approve_join_request($1, null, $2) id', [reqs[0].id, cat]))[0].id
  const nm = (await rows('select member_number, full_name from public.members where id = $1', [newId]))[0]
  ok('approving creates member 18', nm.member_number === 18 && nm.full_name === 'Roya')
  await denied('cannot approve twice', () => rows('select public.approve_join_request($1, null, $2)', [reqs[0].id, cat]))
  await denied('admin cannot demote themself', () =>
    rows(`select public.admin_save_member($1, 1, 'Amin Sadeghi', 'x', null, 'amin@club.test', 'member', 'active')`, [m1]))
  await rows(`select public.admin_save_member($1, 8, 'Sia Ghaem', 'Mortgage Consultancy', null, 'sia@club.test', 'member', 'inactive')`, [m8])
  await rows('select public.redact_referral_client($1)', [ref.id])
  const red = (await rows('select client_first_name, client_contact, need, notes, deal_value_cad from public.referrals where id = $1', [ref.id]))[0]
  ok('redaction wipes client data, keeps the value', red.client_first_name === '[removed]' && red.client_contact === '[removed]' && Number(red.deal_value_cad) === 12500)
})
await as(sia, async () => {
  ok('deactivated member loses access', (await rows('select public.current_member_id() v'))[0].v === null)
})
await as(salarE, async () => {
  await denied('cannot refer to a deactivated member', () => insertReferral(m6, m8))
})
const roya = await login('roya@bakery.test')
await as(roya, async () => ok('approved applicant can log in as a member', (await rows('select public.my_account() a'))[0].a?.member?.member_number === 18))
await as(amin, async () => {
  ok('admin deletes a referral', (await rows('delete from public.referrals where id = $1 returning id', [ref.id])).length === 1)
  ok('its events and notifications are gone', (await rows('select 1 from public.referral_events')).length === 0)
})

console.log('Member survey')
await db.exec('delete from net.sent;')
await as(null, async () => {
  await rows(`insert into public.survey_responses (member_number, time_sink, ai_tools, ok_to_chat, lang)
    values (5, 'Answering the same WhatsApp questions', 'ChatGPT, Gemini', true, 'fa')`)
  ok('visitor can submit a survey answer', true)
  await denied('visitor cannot read survey answers', () => rows('select * from public.survey_responses'))
  await denied('visitor cannot backdate a survey answer', () =>
    rows(`insert into public.survey_responses (time_sink, created_at) values ('x', '2020-01-01')`))
  await denied('survey answer needs the first question', () => rows(`insert into public.survey_responses (time_sink) values ('')`))
  await denied('visitor cannot delete survey answers', () => rows('delete from public.survey_responses returning id'))
})
ok('both admins were told about the survey answer', (await sent()).filter((b) => b.subject.startsWith('New survey answer')).length === 2)
ok('the survey email carries no answers', !JSON.stringify(await sent()).includes('WhatsApp'))
await as(salarE, async () => {
  ok('a member cannot read survey answers', (await rows('select id from public.survey_responses')).length === 0)
  ok('a member cannot delete survey answers', (await rows('delete from public.survey_responses returning id')).length === 0)
})
await as(builder, async () => {
  const all = await rows('select * from public.survey_responses')
  ok('admin reads survey answers', all.length === 1 && all[0].member_number === 5 && all[0].ok_to_chat === true)
  ok('admin deletes a survey answer', (await rows('delete from public.survey_responses where id = $1 returning id', [all[0].id])).length === 1)
})

console.log('Email switch')
await db.exec(`delete from net.sent; update public.member_accounts set login_email = 'member05@example.com' where login_email = 'navid@club.test';`)
const navid2 = await login('member05@example.com')
void navid2
await as(salarE, async () => { await insertReferral(m6, m5) })
ok('placeholder @example.com addresses are never emailed', (await rows('select 1 from net.sent')).length === 0)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
