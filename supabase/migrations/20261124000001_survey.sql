-- Member survey: what members struggle with day to day, so the club knows what to build next.
-- Anyone with the link may submit one answer sheet; only admins can read or delete them.
-- No client information belongs here, and the form says so.

create table public.survey_responses (
  id                uuid primary key default gen_random_uuid(),
  member_number     int  check (member_number between 1 and 9999),     -- optional: who answered
  time_sink         text not null check (char_length(time_sink) between 1 and 1000),
  repeat_questions  text check (char_length(repeat_questions) <= 1000),
  lost_client       text check (char_length(lost_client) <= 1000),
  ai_tools          text check (char_length(ai_tools) <= 200),          -- comma list, e.g. "ChatGPT, Gemini"
  ai_use            text check (char_length(ai_use) <= 1000),
  one_wish          text check (char_length(one_wish) <= 1000),
  ok_to_chat        boolean not null default false,
  lang              text not null default 'en' check (lang in ('en', 'fa')),
  created_at        timestamptz not null default now()
);

alter table public.survey_responses enable row level security;
revoke all on public.survey_responses from anon, authenticated;

grant insert (member_number, time_sink, repeat_questions, lost_client, ai_tools, ai_use, one_wish, ok_to_chat, lang)
  on public.survey_responses to anon, authenticated;
grant select, delete on public.survey_responses to authenticated;

create policy survey_submit on public.survey_responses for insert to anon, authenticated with check (true);
create policy survey_admin_read on public.survey_responses for select to authenticated using ((select public.is_admin()));
create policy survey_admin_delete on public.survey_responses for delete to authenticated using ((select public.is_admin()));

-- Simple flood guard, and the server sets the timestamp.
create or replace function private.survey_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.survey_responses where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many answers right now. Please try again later.' using errcode = 'P0001';
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger survey_before_insert before insert on public.survey_responses
  for each row execute function private.survey_before_insert();

-- Tell the admins a new answer sheet arrived. The email carries no answers, only a link.
create or replace function private.survey_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform private.email_admins(
    'New survey answer | VancoBiz Club',
    private.email_html(
      'A member answered the club survey.',
      'یکی از اعضا به نظرسنجی باشگاه پاسخ داد.',
      '#/admin/survey', 'Read the answers', 'دیدن پاسخ‌ها'
    )
  );
  return null;
end $$;

create trigger survey_after_insert after insert on public.survey_responses
  for each row execute function private.survey_after_insert();

revoke execute on function private.survey_before_insert() from public, anon, authenticated;
revoke execute on function private.survey_after_insert() from public, anon, authenticated;
