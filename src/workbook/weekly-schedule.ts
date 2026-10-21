import type { WeeklyScheduleItem } from '../model/types';

/** Accept native Excel time fractions as well as explicit HH:mm text. */
function clock(value: string, context: string): string {
 if (!value) return '';
 if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
 const fraction = Number(value);
 if (!Number.isFinite(fraction) || fraction < 0 || fraction >= 1) throw new Error(`${context}: use a time such as 18:00.`);
 const minutes = Math.round(fraction * 1440) % 1440;
 return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Blank days inherit the previous day, allowing multiple activities per day. */
export function parseWeeklySchedule(rows: Record<string, string>[]): WeeklyScheduleItem[] {
 const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
 let day = '';
 const items = rows.flatMap((row, index) => {
  day = row.Day || day;
  if (!row.Activity) return [];
  const context = `Weekly schedule row ${index + 1}`;
  const weekday = days.findIndex(name => name.toLowerCase() === day.toLowerCase());
  if (weekday < 0) throw new Error(`${context}: use a weekday name.`);
  const time = clock(row['Time Start'] || row.Time || '', context);
  const end = clock(row['Time End'] || '', context);
  const toMinutes = (value: string): number => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  // Derive duration when no saved formula result is available yet.
  const minutes = row.Minutes ? Number(row.Minutes) : time && end ? (toMinutes(end) - toMinutes(time) + 1440) % 1440 : null;
  if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) throw new Error(`${context}: minutes must be positive.`);
  return [{ id: JSON.stringify([weekday, time, row.Activity]), weekday, time, minutes, title: row.Activity, recordedBy: row['Recorded by'] || 'Tracker', notes: row.Notes ?? '' }];
 });
 if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Weekly schedule contains duplicate activities.');
 return items;
}
