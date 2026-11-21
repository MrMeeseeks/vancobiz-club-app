-- VancoBiz Club: email notifications, sent straight from Postgres.
--
-- How it works: a trigger calls private.send_email(), which uses the pg_net extension to POST
-- to Brevo's transactional email API. The Brevo API key is read from Supabase Vault
-- (secret name: brevo_api_key), so it is never in the repo or in a table you can query by API.
--
-- Emails are OFF until BOTH of these are set (see SETUP_CHECKLIST.md):
--   1. select vault.create_secret('<your Brevo API key>', 'brevo_api_key');
--   2. update private.settings set value = 'you@yourdomain.com' where key = 'email_from_address';
-- Sending never blocks or fails a referral: any email problem is swallowed and logged as a warning.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

create or replace function private.setting(p_key text)
returns text
language sql stable security definer set search_path = ''
as $$ select value from private.settings where key = p_key $$;

create or replace function private.esc(p text)
returns text
language sql immutable set search_path = ''
as $$ select replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') $$;

create or replace function private.send_email(p_to text, p_to_name text, p_subject text, p_html text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_key   text;
  v_from  text := private.setting('email_from_address');
  v_name  text := coalesce(private.setting('email_from_name'), 'VancoBiz Club');
begin
  if p_to is null or p_to = '' or p_to like '%@example.com' then return; end if;
  if v_from is null or v_from = '' then return; end if;
  if to_regclass('vault.decrypted_secrets') is null or to_regproc('net.http_post') is null then return; end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into v_key using 'brevo_api_key';
  if v_key is null or v_key = '' then return; end if;

  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using
      'https://api.brevo.com/v3/smtp/email',
      jsonb_build_object(
        'sender', jsonb_build_object('name', v_name, 'email', v_from),
        'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', coalesce(nullif(p_to_name, ''), p_to))),
        'subject', p_subject,
        'htmlContent', p_html
      ),
      jsonb_build_object('api-key', v_key, 'content-type', 'application/json', 'accept', 'application/json');
exception when others then
  raise warning 'send_email failed: %', sqlerrm;
end $$;

-- Wraps a bilingual message in a simple, on-brand HTML email with a button back to the app.
create or replace function private.email_html(p_en text, p_fa text, p_path text, p_button_en text, p_button_fa text)
returns text
language sql stable security definer set search_path = ''
as $$
  select
    '<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#1f1b14">'
    || '<p style="font-size:20px;margin:0 0 16px">VancoBiz <span style="color:#b8964f">Club</span></p>'
    || '<p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">' || p_en || '</p>'
    || '<p><a href="' || private.setting('site_url') || p_path || '" style="display:inline-block;background:#b8964f;color:#ffffff;'
    || 'text-decoration:none;padding:10px 20px;border-radius:999px;font-family:Arial,sans-serif;font-weight:bold">' || p_button_en || '</a></p>'
    || '<hr style="border:0;border-top:1px solid #ece3d0;margin:24px 0">'
    || '<div dir="rtl" style="text-align:right;font-family:Tahoma,Arial,sans-serif;font-size:16px;line-height:1.8">'
    || '<p>' || p_fa || '</p>'
    || '<p><a href="' || private.setting('site_url') || p_path || '" style="display:inline-block;background:#b8964f;color:#ffffff;'
    || 'text-decoration:none;padding:10px 20px;border-radius:999px;font-weight:bold">' || p_button_fa || '</a></p>'
    || '</div></div>'
$$;

-- Email one member at their login address.
create or replace function private.email_member(p_member_id uuid, p_subject text, p_html text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_name  text;
begin
  select a.login_email, m.full_name into v_email, v_name
  from public.member_accounts a join public.members m on m.id = a.member_id
  where a.member_id = p_member_id and m.status = 'active';
  if v_email is not null then
    perform private.send_email(v_email, v_name, p_subject, p_html);
  end if;
end $$;

-- Email every admin.
create or replace function private.email_admins(p_subject text, p_html text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in select login_email from public.member_accounts where role = 'admin' loop
    perform private.send_email(r.login_email, null, p_subject, p_html);
  end loop;
end $$;
