import type { EquipmentItem, ExerciseArsenalItem } from '../model/types';
type Row = Record<string, string>;
export function parseIntervals(rows: Row[]): {exercise: string; workSeconds: number; restSeconds: number}[] {
 const seen = new Set<string>();
 return rows.map(row => {
  if (!row.Exercise || seen.has(row.Exercise)) throw new Error('Cal-Intervals: use unique exercise names.');
  seen.add(row.Exercise);
  const workSeconds = number(row['Work seconds'], 'Cal-Intervals work seconds');
  const restSeconds = number(row['Rest seconds'], 'Cal-Intervals rest seconds');
  if (workSeconds === undefined || restSeconds === undefined) throw new Error('Cal-Intervals: supply work and rest seconds.');
  return {exercise:row.Exercise,workSeconds,restSeconds};
 });
}
function number(raw: string | undefined, context: string, max = Infinity): number | undefined {
 if (!raw) return undefined;
 const value = Number(raw);
 if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`${context}: use a nonnegative number${Number.isFinite(max) ? ` up to ${max}` : ''}.`);
 return value;
}
export function parseArsenal(rows: Row[]): ExerciseArsenalItem[] {
 let group = '';
 const items = rows.map(row => {
  group = row.Group || group;
  if (!group || !row.Exercise) throw new Error('Exercise arsenal: supply a group and an exercise name.');
  if (/[,:]/.test(row.Exercise)) throw new Error('Exercise arsenal: exercise names must not contain commas or colons.');
  return { group, exercise: row.Exercise, ...(row.Unit ? { unit: row.Unit } : {}),
   ...(row['Base intensity (0–10)'] ? { baseIntensity: number(row['Base intensity (0–10)'], 'Base intensity', 10) } : {}),
   ...(row['Growth per kg'] ? { growthPerKg: number(row['Growth per kg'], 'Growth per kg') } : {}) };
 });
 if (new Set(items.map(item => item.exercise)).size !== items.length) throw new Error('Exercise arsenal: duplicate exercise names.');
 return items;
}
export function parseEquipment(rows: Row[]): EquipmentItem[] {
 const items = rows.map(row => {
  if (!row.Equipment) throw new Error('Equipment: supply an equipment name.');
  const minKg = number(row['Min kg'], 'Equipment minimum kg') ?? 0;
  const maxKg = number(row['Max kg'], 'Equipment maximum kg');
  if (maxKg !== undefined && maxKg < minKg) throw new Error('Equipment: maximum kg must be at least minimum kg.');
  return { name: row.Equipment, minKg, maxKg: maxKg ?? null, notes: row.Notes || '' };
 });
 if (new Set(items.map(item => item.name)).size !== items.length) throw new Error('Equipment: duplicate names.');
 return items;
}
