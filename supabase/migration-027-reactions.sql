-- Migration 027: emoji reactions on chat messages. One of each emoji per person per message.
create table if not exists public.message_reactions (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🔥', '💪', '🎉')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
grant select, insert, delete on public.message_reactions to authenticated;

drop policy if exists "read reactions" on public.message_reactions;
create policy "read reactions" on public.message_reactions for select to authenticated using (public.is_approved());
drop policy if exists "react" on public.message_reactions;
create policy "react" on public.message_reactions for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "unreact" on public.message_reactions;
create policy "unreact" on public.message_reactions for delete to authenticated using (user_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'message_reactions') then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;
