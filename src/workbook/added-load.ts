import type { Session, EquipmentItem, ExerciseArsenalItem } from '../model/types';
import { exerciseTracking } from '../model/exercise-tracking';

/** Sparse load rows supplement sessions; absent rows mean no planned added load. */
export function attachAddedLoads(sessions: Session[], rows: Record<string, string>[], equipment: EquipmentItem[], arsenal: ExerciseArsenalItem[]): void {
 const seen = new Set<string>();
 for (const row of rows) {
  const matches = sessions.filter(session => session.date === row.Date && session.title === row.Session);
  if (matches.length !== 1) throw new Error('Added load: Date and Session must match exactly one imported session.');
  const session = matches[0]!;
  const exercise = row.Exercise;
  const metric = exerciseTracking(session).find(item => item.name === exercise);
  const circuit = arsenal.find(item => item.exercise === exercise && ['Cal-Intervals', 'Core'].includes(item.group));
  if (!exercise || (!metric && !(circuit && new RegExp(`(?:^|\\n)${circuit.group}:`).test(session.prescription ?? '')))) throw new Error('Added load: exercise must belong to the session or its circuit.');
  const key = JSON.stringify([session.id, exercise]);
  if (seen.has(key)) throw new Error('Added load: duplicate exercise within a session.');
  seen.add(key);
  const gear = equipment.find(item => item.name === row.Equipment);
  if (!gear) throw new Error('Added load: select equipment listed in Library.');
  const kg = (name: string): number | null => {
   const input = row[name];
   if (!input && name === 'Actual kg') return null;
   const value = input ? Number(input) : NaN;
   if (!Number.isFinite(value) || value < 0 || (value > 0 && (value < gear.minKg || (gear.maxKg !== null && value > gear.maxKg)))) throw new Error(`Added load: ${name} must be zero or within the equipment weight range.`);
   return value;
  };
  (session.loads ??= []).push({ exercise, group: metric?.group ?? circuit!.group, equipment: gear.name, plannedKg: kg('Planned kg')!, actualKg: kg('Actual kg'), notes: row.Notes || '' });
 }
}
