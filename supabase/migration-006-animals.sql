-- Spirit animals: each member can pick one (mid-energy animals only).
alter table public.profiles add column if not exists animal text;
alter table public.profiles drop constraint if exists profiles_animal_check;
alter table public.profiles add constraint profiles_animal_check check (
  animal is null or animal in (
    'raccoon', 'beaver', 'deer', 'otter', 'sloth', 'hedgehog', 'turtle', 'duck', 'goose', 'koala', 'badger',
    'skunk', 'llama', 'goat', 'owl', 'penguin', 'seal', 'moose', 'chipmunk', 'snail', 'lobster', 'crab'
  )
);
-- Members may change their own name, level and animal (nothing else).
grant update (display_name, level, animal) on public.profiles to authenticated;
