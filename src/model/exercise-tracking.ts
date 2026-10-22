import type { Session } from './types';

export interface ExerciseTracking {
 group: string; name: string; unit: 'reps' | 'seconds' | 'reps/leg' | 'rounds';
 targets: number[]; actual: (number | null)[]; done: boolean | null;
}

/** Only the explicit Daily prescription grammar supplies targets; never achievements. */
export function exerciseTracking(session: Session): ExerciseTracking[] {
 const exercises: ExerciseTracking[] = [];
 for (const line of (session.prescription ?? '').split(/\r?\n/)) {
  const match = /^([ABC])\)\s*(.+):\s*(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(\/leg|sec(?:onds?)?|s|min(?:utes?)?)?\s*$/i.exec(line.trim());
  const core = /^Core:\s*(\d+)\s+rounds\s*$/i.exec(line.trim());
  if (!match && !core) continue;
  const group = core ? 'Core' : match![1]!.toUpperCase();
  if (exercises.some(exercise => exercise.group === group)) continue;
  const count = core ? 1 : Number(match![3] ?? 1);
  if (count < 1 || count > 5) continue;
  const suffix = match?.[5]?.toLowerCase() ?? '';
  const timed = /^(s|sec|second|min)/.test(suffix);
  const target = Number(core?.[1] ?? match![4]) * (suffix.startsWith('min') ? 60 : 1);
  if (!Number.isFinite(target)) continue;
  const done = session.checks?.[`${group} done`] ?? null;
  const actual = Array.from({ length: core ? 1 : Math.max(count, ...[1, 2, 3, 4, 5].filter(i => session.results?.[`${group} ${i} result`]?.trim())) }, (_, i) => {
   const raw = session.results?.[core ? 'Core rounds result' : `${group} ${i + 1} result`]?.trim() ?? '';
   if (done !== true || !raw) return null;
   const time = /^(\d+):([0-5]\d)$/.exec(raw);
   const value = timed && time ? Number(time[1]) * 60 + Number(time[2]) : /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN;
   return Number.isFinite(value) && value >= 0 ? value : null;
  });
  exercises.push({ group, name: core ? 'Core' : match![2]!, unit: core ? 'rounds' : timed ? 'seconds' : suffix === '/leg' ? 'reps/leg' : 'reps', targets: Array<number>(count).fill(target), actual, done });
 }
 return exercises;
}
