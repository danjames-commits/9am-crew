-- Migration 012: a quiet "new in chat" dot.
-- Remembers when each person last opened the chat. The Chat tab shows a dot
-- when someone else has posted since then. No counts, no push.

create table public.chat_reads (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now()
);
alter table public.chat_reads enable row level security;
-- Only mark_chat_read() writes here.
revoke insert, update, delete, truncate on public.chat_reads from authenticated, anon;
create policy "own chat read" on public.chat_reads for select to authenticated
  using (user_id = (select auth.uid()));

-- Mark the chat read now (server clock), returning when you'd last read it.
create or replace function public.mark_chat_read()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  before timestamptz;
begin
  if not public.is_approved() then
    return null;
  end if;
  select read_at into before from public.chat_reads where user_id = auth.uid();
  insert into public.chat_reads (user_id, read_at) values (auth.uid(), now())
  on conflict (user_id) do update set read_at = excluded.read_at;
  return before;
end;
$$;

-- Has anyone else posted since you last opened the chat?
create or replace function public.chat_unread()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved() and exists (
    select 1 from public.messages m
    where m.user_id is distinct from auth.uid()
      and m.created_at > coalesce((select read_at from public.chat_reads where user_id = auth.uid()), '-infinity'::timestamptz)
  );
$$;

revoke all on function public.mark_chat_read() from public, anon;
revoke all on function public.chat_unread() from public, anon;
grant execute on function public.mark_chat_read() to authenticated;
grant execute on function public.chat_unread() to authenticated;
