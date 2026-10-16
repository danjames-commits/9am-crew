// Spirit animals for avatars. Strictly mid-energy: no bears, no lions, nothing that has ever been called an apex predator.
export const ANIMALS = [
  { id: 'raccoon', name: 'Raccoon', vibe: 'Shows up, finds the snacks' },
  { id: 'beaver', name: 'Beaver', vibe: 'Steady worker, big on routine' },
  { id: 'deer', name: 'Deer', vibe: 'Graceful, slightly startled' },
  { id: 'otter', name: 'Otter', vibe: 'Here for the vibes' },
  { id: 'sloth', name: 'Sloth', vibe: 'Every rep counts, eventually' },
  { id: 'hedgehog', name: 'Hedgehog', vibe: 'Small, spiky, determined' },
  { id: 'turtle', name: 'Turtle', vibe: 'Slow and steady wins' },
  { id: 'duck', name: 'Duck', vibe: 'Calm on top, paddling hard below' },
  { id: 'goose', name: 'Goose', vibe: 'Mostly peaceful' },
  { id: 'koala', name: 'Koala', vibe: 'Needs a nap after' },
  { id: 'badger', name: 'Badger', vibe: 'Mildly determined' },
  { id: 'skunk', name: 'Skunk', vibe: 'Keeps to their own lane' },
  { id: 'llama', name: 'Llama', vibe: 'Unbothered' },
  { id: 'goat', name: 'Goat', vibe: 'Will climb the box' },
  { id: 'owl', name: 'Owl', vibe: 'Not really a morning person' },
  { id: 'penguin', name: 'Penguin', vibe: 'Dressed for the occasion' },
  { id: 'seal', name: 'Seal', vibe: 'Claps for everyone' },
  { id: 'moose', name: 'Moose', vibe: 'Big, but chill about it' },
  { id: 'chipmunk', name: 'Chipmunk', vibe: 'Busy, busy, busy' },
  { id: 'snail', name: 'Snail', vibe: 'Brings their own pace' },
  { id: 'lobster', name: 'Lobster', vibe: 'Island royalty' },
  { id: 'crab', name: 'Crab', vibe: 'A bit sideways, gets there' },
] as const;

export type AnimalId = (typeof ANIMALS)[number]['id'];

export const isAnimal = (a: unknown): a is AnimalId => typeof a === 'string' && ANIMALS.some((x) => x.id === a);
export const animalName = (a: string | null | undefined) => ANIMALS.find((x) => x.id === a)?.name ?? null;

/** A drawn avatar is stored as 'custom:<version>' in profiles.animal. */
export const customVersion = (animal?: string | null) => {
  const m = animal ? /^custom:([a-z0-9]{1,16})$/.exec(animal) : null;
  return m ? m[1] : null;
};
