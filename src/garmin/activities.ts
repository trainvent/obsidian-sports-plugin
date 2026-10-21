import type { GarminActivity } from './types';
import { validDate } from '../workbook/daily-log';

/** Validate and whitelist the activity response before persisting anything. */
export function parseActivities(input: unknown, start: string, end: string): GarminActivity[] {
 validDate(start, 'Garmin history start'); validDate(end, 'Garmin history end');
 if (start > end) throw new Error('Garmin history start is in the future.');
 if (!Array.isArray(input) || input.length > 50_000) throw new Error('Invalid Garmin activity list.');
 const activities = new Map<string, GarminActivity>();
 for (const value of input) {
  if (!value || typeof value !== 'object') throw new Error('Invalid Garmin activity.');
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || !/^\d{1,30}$/.test(row.id)) throw new Error('Invalid Garmin activity ID.');
  if (typeof row.date !== 'string' || typeof row.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)) throw new Error('Invalid Garmin activity time.');
  validDate(row.date, 'Garmin activity');
  const text = (key: string, fallback: string): string => {
   const value = row[key];
   if (value === undefined || value === null || value === '') return fallback;
   if (typeof value !== 'string' || value.length > 1000) throw new Error('Invalid Garmin activity label.');
   return value;
  };
  const number = (key: string): number | null => {
   const value = row[key];
   if (value === null || value === undefined) return null;
   if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid Garmin measurement.');
   return value;
  };
  const activity = { id: row.id, date: row.date, time: row.time, name: text('name', 'Activity'), type: text('type', 'activity'), duration: number('duration'), distance: number('distance'), average_hr: number('average_hr') };
  if (activity.date >= start && activity.date <= end) activities.set(activity.id, activity);
 }
 return [...activities.values()].sort((a, b) => `${a.date} ${a.time} ${a.id}`.localeCompare(`${b.date} ${b.time} ${b.id}`));
}
export function activityDetails(activity: GarminActivity): string {
 const details = [activity.time, activity.type.replaceAll('_', ' ')];
 if (activity.duration !== null) details.push(`${(activity.duration / 60).toFixed(1)} min`);
 if (activity.distance !== null) details.push(`${(activity.distance / 1000).toFixed(2)} km`);
 if (activity.average_hr !== null) details.push(`${Math.round(activity.average_hr)} bpm avg`);
 return details.join(' · ');
}
