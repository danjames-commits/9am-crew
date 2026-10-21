import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { aiEnabled, drawLiftArt, takeAllowance } from './ai';
import { ANIMALS, customVersion } from './animals';
import { svgVersion } from './svg-clean';

/** A drawing that's been "drawing" this long has stalled; start again. */
const STALE_MS = 3 * 60 * 1000;

/**
 * Makes sure there's a drawing of this person's spirit animal doing this lift.
 * Drawn once per person per lift and reused, unless they've changed animal or
 * an admin asks for a redraw (force). Never throws: the trophy stays if it fails.
 */
export async function ensurePrArt(supabase: SupabaseClient, opts: { userId: string; movementId: number; actorId: string; force?: boolean }) {
  const { userId, movementId, actorId, force } = opts;
  if (!aiEnabled()) return { error: 'Claude isn’t set up yet.' };
  try {
    const [{ data: person }, { data: movement }, { data: existing }] = await Promise.all([
      supabase.from('profiles').select('display_name, animal').eq('id', userId).maybeSingle(),
      supabase.from('movements').select('name').eq('id', movementId).maybeSingle(),
      supabase.from('pr_art').select('animal, status, updated_at').eq('user_id', userId).eq('movement_id', movementId).maybeSingle(),
    ]);
    const animal = (person?.animal as string | null) ?? null;
    if (!animal || !movement) return { error: 'They need a spirit animal first.' };
    if (!force && existing && existing.animal === animal) {
      if (existing.status === 'ready') return { ok: true };
      if (existing.status === 'drawing' && Date.now() - new Date(existing.updated_at).getTime() < STALE_MS) return { ok: true };
    }
    if (!(await takeAllowance(supabase, actorId, 'prart'))) return { error: 'That’s a lot of drawings today. Try again tomorrow.' };

    // Who to draw: the ready-made animal, or the one they asked Claude for (with its drawing to match).
    let character = '';
    let avatarSvg: string | null = null;
    if (customVersion(animal)) {
      const { data: drawn } = await supabase.from('avatars').select('prompt, svg').eq('user_id', userId).maybeSingle();
      character = drawn?.prompt ? `"${drawn.prompt}" (a cartoon they asked Claude to draw)` : 'their cartoon animal';
      avatarSvg = (drawn?.svg as string | undefined) ?? null;
    } else {
      const preset = ANIMALS.find((a) => a.id === animal);
      if (!preset) return { error: 'Unknown spirit animal.' };
      character = `a ${preset.name.toLowerCase()} (${preset.vibe.toLowerCase()}), in a friendly flat emoji style`;
    }

    const mark = { user_id: userId, movement_id: movementId, animal, status: 'drawing', updated_at: new Date().toISOString() };
    await supabase.from('pr_art').upsert(existing ? { ...mark, svg: undefined } : { ...mark, svg: null });
    const svg = await drawLiftArt({ movement: movement.name as string, character, avatarSvg });
    await supabase
      .from('pr_art')
      .update(svg ? { status: 'ready', svg, updated_at: new Date().toISOString() } : { status: 'failed', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('movement_id', movementId);
    return svg ? { ok: true } : { error: 'The drawing came out wonky. Try again.' };
  } catch {
    await supabase.from('pr_art').update({ status: 'failed' }).eq('user_id', userId).eq('movement_id', movementId);
    return { error: 'Claude couldn’t draw that one. Try again.' };
  }
}

/** Web addresses for the ready drawings of these people's lifts, keyed "userId:movementId". */
export async function prArtUrls(supabase: SupabaseClient, pairs: { userId: string; movementId: number | null | undefined }[]) {
  const wanted = pairs.filter((p): p is { userId: string; movementId: number } => typeof p.movementId === 'number');
  const urls = new Map<string, string>();
  if (!wanted.length) return urls;
  const { data } = await supabase
    .from('pr_art')
    .select('user_id, movement_id, updated_at')
    .eq('status', 'ready')
    .in('user_id', [...new Set(wanted.map((p) => p.userId))])
    .in('movement_id', [...new Set(wanted.map((p) => p.movementId))]);
  for (const a of data ?? []) {
    urls.set(`${a.user_id}:${a.movement_id}`, `/pr-art/${a.user_id}/${a.movement_id}?v=${svgVersion(String(a.updated_at))}`);
  }
  return urls;
}
