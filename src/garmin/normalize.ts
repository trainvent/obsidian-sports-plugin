import { parseActivities } from './activities';
import type { GarminActivity } from './types';

/** Match the original Python import: Garmin local time first, GMT converted if absent. */
export function normalizeGarmin(rows: Record<string, unknown>[], timezone: string, start: string, end: string): GarminActivity[] {
 const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
 return parseActivities(rows.map(row => {
  let date = ''; let time = '';
  if (typeof row.startTimeLocal === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(row.startTimeLocal)) {
   date = row.startTimeLocal.slice(0, 10); time = row.startTimeLocal.slice(11, 16);
  } else if (typeof row.startTimeGMT === 'string') {
   const raw = row.startTimeGMT.replace(' ', 'T');
   const instant = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`);
   const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
   date = `${parts.year}-${parts.month}-${parts.day}`; time = `${parts.hour}:${parts.minute}`;
  }
  const type = row.activityType && typeof row.activityType === 'object' ? (row.activityType as Record<string, unknown>).typeKey : 'activity';
  return { id: typeof row.activityId === 'number' && Number.isSafeInteger(row.activityId) ? String(row.activityId) : row.activityId, date, time, name: row.activityName, type, duration: row.duration, distance: row.distance, average_hr: row.averageHR };
 }), start, end);
}
export function garminToday(timezone: string, now = new Date()): string {
 return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
