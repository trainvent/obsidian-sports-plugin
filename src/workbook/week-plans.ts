import type { WeekPlan } from '../model/types';
import { validDate } from './daily-log';

/** Explicit weekly targets are planning inputs, never inferred achievements. */
export function parseWeekPlans(rows: Record<string, string>[]): WeekPlan[] {
 const numbers = new Set<number>();
 const starts = new Set<string>();
 return rows.map(row => {
  const week = Number(row.Week);
  if (!Number.isInteger(week) || week < 1 || numbers.has(week)) throw new Error('Week plans: Week must be a unique positive integer.');
  const start = validDate(row.Start ?? '', `Week plans week ${week}`);
  if (new Date(`${start}T12:00:00Z`).getUTCDay() !== 1 || starts.has(start)) throw new Error('Week plans: Start must be a unique Monday date.');
  const minutes = row.Minutes ? Number(row.Minutes) : null;
  if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0)) throw new Error('Week plans: Minutes must be a nonnegative number or blank.');
  if (!row.Phase || !row.Focus) throw new Error(`Week plans week ${week}: supply Phase and Focus.`);
  numbers.add(week); starts.add(start);
  return { week, start, phase: row.Phase, focus: row.Focus, targets: row.Targets ?? '', advanceWhen: row['Advance when'] ?? '', minutes };
 }).sort((left, right) => left.start.localeCompare(right.start));
}
