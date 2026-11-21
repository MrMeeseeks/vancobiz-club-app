-- VancoBiz Club: Row Level Security and grants.
-- The anon key is public (it ships in the website), so EVERY table has RLS on, and each role
-- is granted only the operations it needs. Anything not granted here is denied.

alter table public.categories       enable row level security;
alter table public.members          enable row level security;
alter table public.member_accounts  enable row level security;
alter table public.referrals        enable row level security;
alter table public.referral_events  enable row level security;
alter table public.notifications    enable row level security;
alter table public.join_requests    enable row level security;
alter table private.settings        enable row level security;

-- Start from nothing, then grant the minimum.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

-- categories: everyone reads, admins manage.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated using ((select public.is_admin()));

-- members: public directory shows active members. A member edits only their own profile
-- fields (not number or status; those go through admin_save_member). Admins edit anyone.
grant select on public.members to anon, authenticated;
grant update (full_name, full_name_fa, business_name, business_name_fa, category_id, bio_en, bio_fa,
              logo_url, public_email, phone, website)
  on public.members to authenticated;
create policy members_public_read on public.members for select to anon using (status = 'active');
create policy members_read on public.members for select to authenticated
  using (status = 'active' or id = (select public.current_member_id()) or (select public.is_admin()));
create policy members_update_own on public.members for update to authenticated
  using (id = (select public.current_member_id()) or (select public.is_admin()))
  with check (id = (select public.current_member_id()) or (select public.is_admin()));

-- member_accounts: no direct access at all. Read through my_account() / admin_list_accounts(),
-- write through admin_save_member().

-- referrals: you see a referral only if you sent it, received it, or are an admin.
-- You can insert only as yourself. No direct updates: use set_referral_status().
grant select, insert on public.referrals to authenticated;
grant delete on public.referrals to authenticated;
create policy referrals_read on public.referrals for select to authenticated
  using (sender_id = (select public.current_member_id())
      or receiver_id = (select public.current_member_id())
      or (select public.is_admin()));
create policy referrals_send on public.referrals for insert to authenticated
  with check (sender_id = (select public.current_member_id()));
create policy referrals_admin_delete on public.referrals for delete to authenticated
  using ((select public.is_admin()));

-- referral_events: visible exactly when the referral is visible to you (the subquery is itself under RLS).
grant select on public.referral_events to authenticated;
create policy referral_events_read on public.referral_events for select to authenticated
  using (exists (select 1 from public.referrals r where r.id = referral_id));

-- notifications: your own only; you may mark them read.
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated
  using (member_id = (select public.current_member_id()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (member_id = (select public.current_member_id()))
  with check (member_id = (select public.current_member_id()));

-- join_requests: anyone may submit one; only admins can read or delete them.
grant insert (business_name, contact_name, category_text, email, phone, reason) on public.join_requests to anon, authenticated;
grant select, delete on public.join_requests to authenticated;
create policy join_requests_submit on public.join_requests for insert to anon, authenticated with check (true);
create policy join_requests_admin_read on public.join_requests for select to authenticated using ((select public.is_admin()));
create policy join_requests_admin_delete on public.join_requests for delete to authenticated using ((select public.is_admin()));

-- Functions: only logged-in users may call the RPCs (each one also checks the caller itself).
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.current_member_id() to anon, authenticated;   -- used inside policies
grant execute on function public.is_admin() to anon, authenticated;            -- used inside policies
grant execute on function public.my_account() to authenticated;
grant execute on function public.my_stats() to authenticated;
grant execute on function public.set_referral_status(uuid, text, numeric) to authenticated;
grant execute on function public.admin_month_report(text) to authenticated;
grant execute on function public.redact_referral_client(uuid) to authenticated;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_save_member(uuid, integer, text, text, integer, text, text, text) to authenticated;
grant execute on function public.approve_join_request(uuid, integer, integer) to authenticated;
grant execute on function public.reject_join_request(uuid) to authenticated;
