-- VancoBiz Club: identity helpers, triggers and the RPC functions the app calls.
-- All functions are SECURITY DEFINER with an empty search_path and check the caller themselves.

-- ---------------------------------------------------------------------------
-- Who is calling?
-- A login counts only if its email is CONFIRMED and matches an account's login_email.
-- ---------------------------------------------------------------------------
create or replace function private.current_account()
returns public.member_accounts
language sql stable security definer set search_path = ''
as $$
  select a.*
  from public.member_accounts a
  join auth.users u on lower(u.email) = a.login_email
  left join public.members m on m.id = a.member_id
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
    and (a.member_id is null or m.status = 'active')
  limit 1
$$;

create or replace function public.current_member_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select (private.current_account()).member_id $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((private.current_account()).role = 'admin', false) $$;

-- The logged-in user's account, role and member profile (null if their email isn't on the list).
create or replace function public.my_account()
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'login_email', a.login_email,
    'role', a.role,
    'member', (select row_to_json(m) from public.members m where m.id = a.member_id)
  )
  from private.current_account() a
  where a.id is not null
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger members_touch before update on public.members
  for each row execute function private.touch_updated_at();

-- New referrals always start clean, whatever the client sends.
create or replace function private.referral_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.members where id = new.receiver_id and status = 'active') then
    raise exception 'The receiving member is not active.' using errcode = 'P0001';
  end if;
  new.client_first_name := btrim(new.client_first_name);
  new.client_contact := btrim(new.client_contact);
  new.need := btrim(new.need);
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');
  new.status := 'pending';
  new.deal_value_cad := null;
  new.consent_at := now();
  new.created_at := now();
  new.updated_at := now();
  new.responded_at := null;
  new.closed_at := null;
  new.client_redacted_at := null;
  return new;
end $$;

create trigger referral_before_insert before insert on public.referrals
  for each row execute function private.referral_before_insert();

-- After a referral is sent: audit row, in-app notification and email to the receiver.
-- The email deliberately contains no client details; the member logs in to see them.
create or replace function private.referral_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_sender text;
begin
  insert into public.referral_events (referral_id, actor_member_id, from_status, to_status)
  values (new.id, new.sender_id, null, 'pending');

  insert into public.notifications (member_id, kind, referral_id)
  values (new.receiver_id, 'referral_received', new.id);

  select full_name into v_sender from public.members where id = new.sender_id;
  perform private.email_member(
    new.receiver_id,
    'New referral from ' || v_sender || ' | VancoBiz Club',
    private.email_html(
      '<strong>' || private.esc(v_sender) || '</strong> sent you a new client referral. Log in to see the details and accept or decline.',
      '<strong>' || private.esc(v_sender) || '</strong> یک مشتری جدید به شما معرفی کرد. برای دیدن جزئیات و پذیرفتن یا رد کردن وارد شوید.',
      '#/app/referrals', 'Open referral', 'مشاهده معرفی'
    )
  );
  return null;
end $$;

create trigger referral_after_insert after insert on public.referrals
  for each row execute function private.referral_after_insert();

-- Thank-you loop: when a referral is marked Won, thank the sender (in-app + email).
create or replace function private.referral_after_won()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_receiver text;
begin
  insert into public.notifications (member_id, kind, referral_id)
  values (new.sender_id, 'referral_won', new.id);

  select full_name into v_receiver from public.members where id = new.receiver_id;
  perform private.email_member(
    new.sender_id,
    'Your referral to ' || v_receiver || ' closed | VancoBiz Club',
    private.email_html(
      'Your referral to <strong>' || private.esc(v_receiver) || '</strong> closed. Thank you from the Club!',
      'معرفی شما به <strong>' || private.esc(v_receiver) || '</strong> به نتیجه رسید. از طرف باشگاه سپاسگزاریم!',
      '#/app', 'Open dashboard', 'مشاهده داشبورد'
    )
  );
  return null;
end $$;

create trigger referral_after_won after update of status on public.referrals
  for each row when (new.status = 'won' and old.status is distinct from 'won')
  execute function private.referral_after_won();

-- Join requests: basic flood guard, then email the admins.
create or replace function private.join_request_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.join_requests where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many requests right now. Please try again later.' using errcode = 'P0001';
  end if;
  new.status := 'new';
  new.created_at := now();
  new.reviewed_at := null;
  new.email := lower(btrim(new.email));
  return new;
end $$;

create trigger join_request_before_insert before insert on public.join_requests
  for each row execute function private.join_request_before_insert();

create or replace function private.join_request_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.email_admins(
    'New request to join | VancoBiz Club',
    private.email_html(
      '<strong>' || private.esc(new.business_name) || '</strong> (' || private.esc(new.contact_name) || ') asked to join the Club.',
      '<strong>' || private.esc(new.business_name) || '</strong> (' || private.esc(new.contact_name) || ') درخواست عضویت در باشگاه داده است.',
      '#/admin/requests', 'Review request', 'بررسی درخواست'
    )
  );
  return null;
end $$;

create trigger join_request_after_insert after insert on public.join_requests
  for each row execute function private.join_request_after_insert();

-- ---------------------------------------------------------------------------
-- RPC: change a referral's status. Only the receiving member (or an admin) may do it,
-- and only along: pending -> accepted | declined;  accepted -> contacted | won | lost;
-- contacted -> won | lost.  A deal value is allowed only with 'won'.
-- ---------------------------------------------------------------------------
create or replace function public.set_referral_status(p_referral_id uuid, p_status text, p_deal_value numeric default null)
returns public.referrals
language plpgsql security definer set search_path = ''
as $$
declare
  v_me     uuid := public.current_member_id();
  v_admin  boolean := public.is_admin();
  r        public.referrals;
  v_old    text;
begin
  select * into r from public.referrals where id = p_referral_id for update;
  if not found or not (v_admin or (v_me is not null and r.receiver_id = v_me)) then
    raise exception 'Referral not found, or you are not the member who received it.' using errcode = '42501';
  end if;

  if not (
       (r.status = 'pending'   and p_status in ('accepted', 'declined'))
    or (r.status = 'accepted'  and p_status in ('contacted', 'won', 'lost'))
    or (r.status = 'contacted' and p_status in ('won', 'lost'))
  ) then
    raise exception 'A referral cannot go from % to %.', r.status, p_status using errcode = 'P0001';
  end if;

  if p_deal_value is not null and (p_status <> 'won' or p_deal_value < 0) then
    raise exception 'A deal value can only be set, as a positive amount, when marking a referral won.' using errcode = 'P0001';
  end if;

  v_old := r.status;
  update public.referrals set
    status = p_status,
    deal_value_cad = case when p_status = 'won' then p_deal_value else null end,
    updated_at = now(),
    responded_at = case when p_status in ('accepted', 'declined') then now() else responded_at end,
    closed_at = case when p_status in ('declined', 'won', 'lost') then now() else closed_at end
  where id = p_referral_id
  returning * into r;

  insert into public.referral_events (referral_id, actor_member_id, from_status, to_status)
  values (p_referral_id, v_me, v_old, p_status);

  return r;
end $$;

-- RPC: the caller's own numbers.
create or replace function public.my_stats()
returns json
language sql stable security definer set search_path = ''
as $$
  with me as (select public.current_member_id() as id)
  select json_build_object(
    'sent',            count(*) filter (where r.sender_id = me.id),
    'received',        count(*) filter (where r.receiver_id = me.id),
    'won_received',    count(*) filter (where r.receiver_id = me.id and r.status = 'won'),
    'value_received',  coalesce(sum(r.deal_value_cad) filter (where r.receiver_id = me.id and r.status = 'won'), 0),
    'sent_won',        count(*) filter (where r.sender_id = me.id and r.status = 'won'),
    'value_generated', coalesce(sum(r.deal_value_cad) filter (where r.sender_id = me.id and r.status = 'won'), 0)
  )
  from me left join public.referrals r on me.id is not null and (r.sender_id = me.id or r.receiver_id = me.id)
  group by me.id
$$;

-- RPC (admin): club report for one month, 'YYYY-MM', in Vancouver time.
-- "total/accepted/declined/pending" count referrals CREATED in the month;
-- "won/lost/won_value" count referrals CLOSED in the month.
create or replace function public.admin_month_report(p_month text)
returns json
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_out   json;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Month must look like 2026-11.' using errcode = 'P0001';
  end if;
  v_start := (p_month || '-01')::timestamp at time zone 'America/Vancouver';
  v_end   := ((p_month || '-01')::timestamp + interval '1 month') at time zone 'America/Vancouver';

  with created as (
    select * from public.referrals where created_at >= v_start and created_at < v_end
  ), closed as (
    select * from public.referrals where closed_at >= v_start and closed_at < v_end
  ), top as (
    select m.id as member_id, m.full_name, m.full_name_fa, m.business_name,
           (select count(*) from created c where c.sender_id = m.id) as sent,
           (select count(*) from closed c where c.sender_id = m.id and c.status = 'won') as won,
           (select coalesce(sum(c.deal_value_cad), 0) from closed c where c.sender_id = m.id and c.status = 'won') as value
    from public.members m
  ), flow as (
    select s.category_id as from_category_id, rc.category_id as to_category_id,
           count(*) filter (where r.created_at >= v_start and r.created_at < v_end) as count,
           count(*) filter (where r.status = 'won' and r.closed_at >= v_start and r.closed_at < v_end) as won,
           coalesce(sum(r.deal_value_cad) filter (where r.status = 'won' and r.closed_at >= v_start and r.closed_at < v_end), 0) as value
    from public.referrals r
    join public.members s on s.id = r.sender_id
    join public.members rc on rc.id = r.receiver_id
    where (r.created_at >= v_start and r.created_at < v_end) or (r.closed_at >= v_start and r.closed_at < v_end)
    group by s.category_id, rc.category_id
  )
  select json_build_object(
    'month', p_month,
    'total',    (select count(*) from created),
    'accepted', (select count(*) from created where status not in ('pending', 'declined')),
    'declined', (select count(*) from created where status = 'declined'),
    'pending',  (select count(*) from created where status = 'pending'),
    'won',      (select count(*) from closed where status = 'won'),
    'lost',     (select count(*) from closed where status = 'lost'),
    'won_value', (select coalesce(sum(deal_value_cad), 0) from closed where status = 'won'),
    'all_time_total', (select count(*) from public.referrals),
    'all_time_won_value', (select coalesce(sum(deal_value_cad), 0) from public.referrals where status = 'won'),
    'top_referrers', (select coalesce(json_agg(t order by t.sent desc, t.value desc, t.full_name), '[]'::json)
                      from top t where t.sent > 0 or t.won > 0),
    'flow', (select coalesce(json_agg(f order by f.count desc, f.value desc), '[]'::json) from flow f)
  ) into v_out;
  return v_out;
end $$;

-- RPC (admin): privacy. Remove a client's personal data but keep the referral in the stats.
create or replace function public.redact_referral_client(p_referral_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  update public.referrals set
    client_first_name = '[removed]', client_contact = '[removed]', need = '[removed]', notes = null,
    client_redacted_at = now(), updated_at = now()
  where id = p_referral_id;
  if not found then raise exception 'Referral not found.' using errcode = 'P0001'; end if;
end $$;

-- RPC (admin): list login accounts with whether/when they last logged in.
create or replace function public.admin_list_accounts()
returns table (account_id uuid, member_id uuid, login_email text, role text, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return query
    select a.id, a.member_id, a.login_email, a.role, u.last_sign_in_at
    from public.member_accounts a
    left join auth.users u on lower(u.email) = a.login_email
    order by a.created_at;
end $$;

-- RPC (admin): create a member (p_member_id null) or update one, together with its login account.
create or replace function public.admin_save_member(
  p_member_id uuid,
  p_member_number integer,
  p_full_name text,
  p_business_name text,
  p_category_id integer,
  p_login_email text,
  p_role text default 'member',
  p_status text default 'active'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id     uuid := p_member_id;
  v_email  text := lower(btrim(coalesce(p_login_email, '')));
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'A login email is required.' using errcode = 'P0001';
  end if;
  if p_member_id is not null and p_member_id = public.current_member_id() and (p_role <> 'admin' or p_status <> 'active') then
    raise exception 'You cannot remove your own admin access.' using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.members (member_number, full_name, business_name, category_id, status)
    values (coalesce(p_member_number, (select coalesce(max(member_number), 0) + 1 from public.members)),
            btrim(p_full_name), btrim(p_business_name), p_category_id, p_status)
    returning id into v_id;
  else
    update public.members set
      member_number = coalesce(p_member_number, member_number),
      full_name = btrim(p_full_name), business_name = btrim(p_business_name),
      category_id = p_category_id, status = p_status
    where id = v_id;
    if not found then raise exception 'Member not found.' using errcode = 'P0001'; end if;
  end if;

  insert into public.member_accounts (member_id, login_email, role)
  values (v_id, v_email, p_role)
  on conflict (member_id) do update set login_email = excluded.login_email, role = excluded.role;

  return v_id;
end $$;

-- RPC (admin): approve a join request -> creates the member and their login account.
create or replace function public.approve_join_request(p_request_id uuid, p_member_number integer, p_category_id integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  j     public.join_requests;
  v_id  uuid;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  select * into j from public.join_requests where id = p_request_id for update;
  if not found or j.status <> 'new' then
    raise exception 'Request not found or already reviewed.' using errcode = 'P0001';
  end if;

  v_id := public.admin_save_member(null, p_member_number, j.contact_name, j.business_name, p_category_id, j.email, 'member', 'active');
  update public.members set public_email = j.email, phone = j.phone where id = v_id;
  update public.join_requests set status = 'approved', reviewed_at = now() where id = p_request_id;
  return v_id;
end $$;

create or replace function public.reject_join_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  update public.join_requests set status = 'rejected', reviewed_at = now()
  where id = p_request_id and status = 'new';
  if not found then raise exception 'Request not found or already reviewed.' using errcode = 'P0001'; end if;
end $$;
