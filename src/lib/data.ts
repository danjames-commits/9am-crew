import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { estimateMax } from './programming/engine';

export interface Program {
  cycle_start: string;
  cycle_weeks: number;
  goals: string[];
}

export async function getProgram(supabase: SupabaseClient): Promise<Program> {
  const { data } = await supabase.from('program').select('cycle_start, cycle_weeks, goals').eq('id', 1).single();
  return data ?? { cycle_start: new Date().toISOString().slice(0, 10), cycle_weeks: 6, goals: [] };
}

export interface LiftLog {
  id: number;
  movement_id: number;
  weight: number;
  reps: number;
  logged_on: string | null;
  is_pr: boolean;
}

export interface Best {
  movementId: number;
  movement: string;
  weight: number;
  reps: number;
  estMax: number;
  lastLogged: string | null;
  lastPr: string | null;
  recent: number[]; // estimated maxes of the last 5 logs, oldest first
}

/** A member's best for each movement they've logged. */
export async function getBests(supabase: SupabaseClient, userId: string) {
  const [{ data: movements }, { data: logs }] = await Promise.all([
    supabase.from('movements').select('id, name, sort').order('sort'),
    supabase
      .from('lift_logs')
      .select('id, movement_id, weight, reps, logged_on, is_pr')
      .eq('user_id', userId)
      .order('logged_on', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true }),
  ]);
  const names = new Map<number, string>((movements ?? []).map((m) => [m.id, m.name]));
  const byMovement = new Map<number, LiftLog[]>();
  for (const l of (logs ?? []) as LiftLog[]) {
    const list = byMovement.get(l.movement_id) ?? [];
    list.push({ ...l, weight: Number(l.weight) });
    byMovement.set(l.movement_id, list);
  }
  const bests: Best[] = [];
  for (const [movementId, list] of byMovement) {
    let top = list[0];
    for (const l of list) if (l.weight > top.weight || (l.weight === top.weight && l.reps > top.reps)) top = l;
    const prs = list.filter((l) => l.is_pr);
    bests.push({
      movementId,
      movement: names.get(movementId) ?? 'Lift',
      weight: top.weight,
      reps: top.reps,
      estMax: Math.max(...list.map((l) => estimateMax(l.weight, l.reps))),
      lastLogged: list[list.length - 1].logged_on,
      lastPr: prs.length ? prs[prs.length - 1].logged_on : null,
      recent: list.slice(-5).map((l) => estimateMax(l.weight, l.reps)),
    });
  }
  const order = new Map((movements ?? []).map((m, i) => [m.id, i]));
  bests.sort((a, b) => (order.get(a.movementId) ?? 0) - (order.get(b.movementId) ?? 0));
  return { bests, movements: (movements ?? []) as { id: number; name: string }[] };
}

export async function getNames(supabase: SupabaseClient) {
  const { data } = await supabase.from('profiles').select('id, display_name').eq('approved', true);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name])) as Record<string, string>;
}

export interface PrPost {
  id: number;
  user_id: string;
  body: string;
  lift_log_id: number;
  created_at: string;
  cheers: number;
  cheeredByMe: boolean;
}

export async function recentPrs(supabase: SupabaseClient, meId: string, sinceDays = 10, limit = 6): Promise<PrPost[]> {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data } = await supabase
    .from('messages')
    .select('id, user_id, body, lift_log_id, created_at')
    .eq('kind', 'pr')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);
  const posts = data ?? [];
  if (!posts.length) return [];
  const { data: cheers } = await supabase
    .from('cheers')
    .select('lift_log_id, user_id')
    .in('lift_log_id', posts.map((p) => p.lift_log_id));
  return posts.map((p) => {
    const mine = (cheers ?? []).filter((c) => c.lift_log_id === p.lift_log_id);
    return { ...p, cheers: mine.length, cheeredByMe: mine.some((c) => c.user_id === meId) };
  });
}
