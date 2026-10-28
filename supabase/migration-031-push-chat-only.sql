-- Migration 031: only real chat messages send a notification. Personal bests,
-- class milestones and the Friday recap still show in the chat, just quietly.

create or replace function public.push_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.kind, 'text') = 'text' and exists (select 1 from public.push_subscriptions where chat) then
    perform public.push_kick('chat', new.id::text);
  end if;
  return new;
end $$;
