import 'server-only';
import { prArtUrls } from './pr-art';
import type { SupabaseClient } from '@supabase/supabase-js';
import { estimateMax, type SavedCycle, type Schedule } from './programming/engine';
import { classDays, daysBetween } from './dates';
import type { Benchmark, BenchResult } from './benchmarks';

export interface Program {
  cycle_start: string;
  cycle_weeks: number;
  goals: string[];
}

export async function getProgram(supabase: SupabaseClient): Promise<Program> {
  const { data } = await supabase.from('program').select('cycle_start, cycle_weeks, goals').eq('id', 1).single();
  return data ?? { cycle_start: new Date().toISOString().slice(0, 10), cycle_weeks: 6, goals: [] };
}

/** The built-in program plus every planned cycle: everything needed to work out any day's plan. */
export async function getSchedule(supabase: SupabaseClient): Promise<Schedule> {
  const [program, { data: cycles }] = await Promise.all([
    getProgram(supabase),
    supabase.from('cycles').select('id, start_date, name, why, brief, goals, weeks, days').order('start_date'),
  ]);
  return {
    cycleStart: program.cycle_start,
    cycleWeeks: program.cycle_weeks,
    goals: program.goals,
    cycles: (cycles ?? []) as SavedCycle[],
  };
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

/** Everyone's name and spirit animal, by id. */
export async function getPeople(supabase: SupabaseClient) {
  const { data } = await supabase.from('profiles').select('id, display_name, animal').eq('approved', true);
  const names: Record<string, string> = {};
  const animals: Record<string, string | null> = {};
  for (const p of data ?? []) {
    names[p.id] = p.display_name;
    animals[p.id] = p.animal ?? null;
  }
  return { names, animals };
}

export interface PrPost {
  id: number;
  user_id: string;
  body: string;
  lift_log_id: number;
  created_at: string;
  cheers: number;
  cheeredByMe: boolean;
  movementId: number | null;
  /** Their spirit animal doing this lift, once Claude has drawn it. */
  art?: string;
}

export async function recentPrs(supabase: SupabaseClient, meId: string, sinceDays = 10, limit = 6): Promise<PrPost[]> {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data } = await supabase
    .from('messages')
    // Cheers ride along through the shared lift log, so it's one request.
    .select('id, user_id, body, lift_log_id, created_at, lift_logs(movement_id, cheers(user_id))')
    .eq('kind', 'pr')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);
  const posts = (data ?? []).map(({ lift_logs, ...p }) => {
    const cheers = embeddedCheers(lift_logs);
    return { ...p, cheers: cheers.length, cheeredByMe: cheers.some((c) => c.user_id === meId), movementId: embeddedMovement(lift_logs) };
  });
  const art = await prArtUrls(supabase, posts.map((p) => ({ userId: p.user_id, movementId: p.movementId })));
  return posts.map((p) => ({ ...p, art: art.get(`${p.user_id}:${p.movementId}`) }));
}

/** The lift embedded by a `lift_logs(movement_id, …)` select. */
export function embeddedMovement(liftLog: unknown): number | null {
  const id = (liftLog as { movement_id?: number } | null)?.movement_id;
  return typeof id === 'number' ? id : null;
}

/** The cheers embedded by a `lift_logs(cheers(user_id))` select. */
export function embeddedCheers(liftLog: unknown): { user_id: string }[] {
  return (liftLog as { cheers?: { user_id: string }[] } | null)?.cheers ?? [];
}

/** Weekdays between two dates (inclusive) that don't have a workout yet. */
export async function emptyDays(supabase: SupabaseClient, from: string, to: string) {
  if (to < from) return [];
  const all = classDays(from, Math.ceil((daysBetween(from, to) + 1) * (5 / 7)) + 2).filter((d) => d <= to);
  if (!all.length) return [];
  const { data } = await supabase.from('workouts').select('class_date').gte('class_date', all[0]).lte('class_date', all[all.length - 1]);
  const taken = new Set((data ?? []).map((w) => w.class_date as string));
  return all.filter((d) => !taken.has(d));
}

/** The benchmark list, and one member's results (oldest first). */
export async function getBenchmarks(supabase: SupabaseClient, userId: string) {
  const [{ data: benchmarks }, { data: results }] = await Promise.all([
    supabase.from('benchmarks').select('id, name, score, better, description, sort').order('sort').order('name'),
    supabase
      .from('benchmark_results')
      .select('id, benchmark_id, user_id, done_on, level, time_s, rounds, reps, amount, capped, note, workout_date')
      .eq('user_id', userId)
      .order('done_on', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true }),
  ]);
  const mine = ((results ?? []) as BenchResult[]).map((r) => ({ ...r, amount: r.amount == null ? null : Number(r.amount) }));
  return { benchmarks: (benchmarks ?? []) as Benchmark[], results: mine };
}
