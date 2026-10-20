-- Migration 013: the Ron rule.
-- Anyone flagged "shouty" has their chat messages posted IN ALL CAPS 🤘.
-- Only set from the database (members can't change it on themselves).

alter table public.profiles add column if not exists shouty boolean not null default false;

create or replace function public.shout_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'text' and exists (select 1 from public.profiles where id = new.user_id and shouty) then
    new.body := upper(left(new.body, 1997));
    if right(new.body, 1) <> '🤘' then
      new.body := new.body || ' 🤘';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shout_message on public.messages;
create trigger shout_message before insert on public.messages
  for each row execute function public.shout_message();
