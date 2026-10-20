import type { WeeklyScheduleItem } from '../model/types';

/** Empty activities are placeholders, so the seven-day template needs no manual results. */
export function parseWeeklySchedule(rows: Record<string, string>[]): WeeklyScheduleItem[] {
 const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
 const items = rows.flatMap((row, index) => {
  if (!row.Activity) return [];
  const weekday = days.findIndex(day => day.toLowerCase() === row.Day?.toLowerCase());
  if (weekday < 0) throw new Error(`Weekly schedule row ${index + 1}: use a weekday name.`);
  const time = row.Time ?? '';
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Weekly schedule row ${index + 1}: use a text time such as 18:00.`);
  const minutes = row.Minutes ? Number(row.Minutes) : null;
  if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) throw new Error(`Weekly schedule row ${index + 1}: minutes must be positive.`);
  return [{ id: JSON.stringify([weekday, time, row.Activity]), weekday, time, minutes, title: row.Activity, recordedBy: row['Recorded by'] || 'Tracker', notes: row.Notes ?? '' }];
 });
 if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Weekly schedule contains duplicate activities.');
 return items;
}
