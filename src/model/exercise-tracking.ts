import type { Session } from './types';

export interface ExerciseTracking {
 group: string; name: string; unit: string;
 targets: (number | null)[]; actual: (number | null)[]; done: boolean | null;
 aggregation?: 'total' | 'average' | 'min' | 'max' | 'last';
 resultKeys?: string[]; setNumbers?: number[]; setChecks?: (boolean | null)[];
}

export function resultKey(exercise: ExerciseTracking, index: number): string {
 return exercise.resultKeys?.[index] ?? `${exercise.group} ${index + 1} result`;
}

/** Structured set rows are authoritative. Prose supplies explicit targets only. */
export function exerciseTracking(session: Session): ExerciseTracking[] {
 if (session.tracking) return session.tracking;
 const exercises: ExerciseTracking[] = [];
 for (const line of (session.prescription ?? '').split(/\r?\n|,\s*/)) {
  const match = /^(?:([^):]+)\)\s*)?(.+):\s*(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(.*?)\s*$/i.exec(line.trim());
  if (!match) continue;
  const group = (match[1] || match[2])!.trim();
  if (exercises.some(exercise => exercise.group === group)) continue;
  const count = Number(match[3] ?? 1);
  // Bound allocations for untrusted prose; row-based tracking has no set-number allocation.
  if (count < 1 || count > 10000) continue;
  const suffix = match[5]!.toLowerCase();
  const timed = /^(?:s|secs?|seconds?|mins?|minutes?)$/.test(suffix);
  const rounds = suffix === 'rounds';
  const target = Number(match[4]) * (timed && suffix.startsWith('min') ? 60 : 1);
  if (!Number.isFinite(target)) continue;
  // Do not interpret tempo, rest instructions or a compound dosage as a numeric unit.
  if (suffix && !timed && !rounds && !/^(?:\/leg|[\p{L}%][\p{L}\d/%²³-]*)$/u.test(suffix)) continue;
  const numbered = Object.keys(session.results ?? {}).flatMap(key => {
   if (!key.startsWith(`${group} `)) return [];
   const index = /^([1-9]\d*) result$/.exec(key.slice(group.length + 1));
   return index && session.results?.[key]?.trim() ? [Number(index[1])] : [];
  });
  const length = rounds ? 1 : Math.max(count, ...numbered.filter(index => index <= 10000));
  const resultKeys = Array.from({ length }, (_, i) => rounds ? `${group} rounds result` : `${group} ${i + 1} result`);
  const done = session.checks?.[`${group} done`] ?? null;
  const actual = resultKeys.map(key => {
   const raw = session.results?.[key]?.trim() ?? '';
   if (done !== true || !raw) return null;
   const time = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(raw);
   const value = timed && time ? time[3] ? Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]) : Number(time[1]) * 60 + Number(time[2]) : /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN;
   return Number.isFinite(value) && value >= 0 ? value : null;
  });
  exercises.push({ group, name: match[2]!, unit: rounds ? 'rounds' : timed ? 'seconds' : suffix === '/leg' ? 'reps/leg' : suffix || 'reps', targets: Array<number>(count).fill(target), actual, done, resultKeys });
 }
 return exercises;
}

/** Explicit aggregation makes a load or effort comparison meaningful without mixing metrics. */
export function aggregateValues(values: (number | null)[], mode: ExerciseTracking['aggregation'] = 'total'): number | null {
 const recorded = values.filter((value): value is number => value !== null);
 if (!recorded.length) return null;
 if (mode === 'last') return recorded[recorded.length - 1]!;
 if (mode === 'min') return recorded.reduce((a, b) => Math.min(a, b));
 if (mode === 'max') return recorded.reduce((a, b) => Math.max(a, b));
 const total = recorded.reduce((sum, value) => sum + value, 0);
 return mode === 'average' ? total / recorded.length : total;
}
