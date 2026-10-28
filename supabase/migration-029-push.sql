-- Migration 029: phone notifications (web push). Each phone that turns notifications on
-- saves a subscription here. When someone posts in the chat or signs up, the database
-- pings the app (/api/push) with a one-time ticket; the app asks push_job() who to tell
-- and sends the notifications. Chat is grouped: one notification per unread batch, then
-- nothing more until you've opened the chat. Admins can also get new sign-ups.
-- The signing key for sending lives in app_secrets (no access except through push_job).

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  chat boolean not null default true,
  signups boolean not null default true,
  last_chat_push_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Ping the app about something to tell people.
create or replace function public.push_kick(kind text, ref text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare t text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  delete from public.cron_tickets where created_at < now() - interval '1 hour';
  insert into public.cron_tickets (token) values (t);
  perform net.http_get('https://9amcrew.ca/api/push?ticket=' || t || '&kind=' || kind || '&ref=' || ref);
end $$;
revoke all on function public.push_kick(text, text) from public, anon, authenticated;

create or replace function public.push_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_subscriptions where chat) then
    perform public.push_kick('chat', new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists push_on_message on public.messages;
create trigger push_on_message after insert on public.messages for each row execute function public.push_on_message();

create or replace function public.push_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.approved and exists (select 1 from public.push_subscriptions where signups) then
    perform public.push_kick('signup', new.id::text);
  end if;
  return new;
end $$;
drop trigger if exists push_on_signup on public.profiles;
create trigger push_on_signup after insert on public.profiles for each row execute function public.push_on_signup();

-- Who to tell and what to say, for a ticket from push_kick. Marks chat batches as sent.
create or replace function public.push_job(ticket text, kind text, ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m record;
  who text;
  title text;
  body text;
  url text;
  subs jsonb;
begin
  if not exists (select 1 from public.cron_tickets where token = ticket and created_at > now() - interval '10 minutes') then
    return null;
  end if;

  if kind = 'chat' then
    select * into m from public.messages where id = ref::bigint;
    if not found then return null; end if;
    who := coalesce((select split_part(display_name, ' ', 1) from public.profiles where id = m.user_id), '9AM Crew');
    title := '9AM Crew chat';
    body := case m.kind
      when 'pr' then who || ' hit a new best: ' || m.body
      when 'milestone' then who || ' hit ' || m.body || ' 🎉'
      when 'recap' then 'The Friday recap is up'
      else who || ': ' || left(m.body, 140) end;
    url := '/chat';
    -- Grouped: only people who've opened the chat since their last chat notification.
    with picked as (
      update public.push_subscriptions s set last_chat_push_at = now()
      from public.profiles p
      where p.id = s.user_id and p.approved and s.chat
        and s.user_id is distinct from m.user_id
        and (s.last_chat_push_at is null
             or s.last_chat_push_at < coalesce((select read_at from public.chat_reads r where r.user_id = s.user_id), '-infinity'))
      returning s.endpoint, s.p256dh, s.auth
    )
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]') into subs from picked;
  elsif kind = 'signup' then
    who := coalesce((select display_name from public.profiles where id = ref::uuid), 'Someone');
    title := 'New sign-up';
    body := who || ' wants to join 9AM Crew. Tap to approve.';
    url := '/admin/members';
    select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]') into subs
      from public.push_subscriptions s join public.profiles p on p.id = s.user_id
      where s.signups and p.approved and p.is_admin;
  else
    return null;
  end if;

  return jsonb_build_object(
    'title', title, 'body', body, 'url', url, 'tag', kind, 'subs', subs,
    'key', (select value from public.app_secrets where name = 'vapid_private_key')
  );
end $$;
grant execute on function public.push_job(text, text, text) to anon;

-- Drop subscriptions the phone has turned off (the push service says they're gone), and use up the ticket.
create or replace function public.push_done(ticket text, gone text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cron_tickets where token = ticket and created_at > now() - interval '10 minutes') then return; end if;
  delete from public.push_subscriptions where endpoint = any (gone);
  delete from public.cron_tickets where token = ticket;
end $$;
grant execute on function public.push_done(text, text[]) to anon;
