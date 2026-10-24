import type { TrainingPlan } from '../model/types';
import type { CoachCache } from '../garmin/coach';
import { scheduleOn } from '../model/calendar';
import { garminToday } from '../garmin/normalize';

function text(value: string): string {
 return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}

/** A date groups sources without implying that two prescriptions are the same workout. */
export function calendarMarkdown(plan: TrainingPlan | null, coachEnabled: boolean | undefined, cache?: CoachCache, now = new Date(), specializedEnabled = plan !== null): string {
 const today = garminToday(plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, now);
 const dates = new Map<string, { manual: string[]; coach: string[]; weekly: string[] }>();
 const day = (date: string) => {
  let row = dates.get(date);
  if (!row) { row = { manual: [], coach: [], weekly: [] }; dates.set(date, row); }
  return row;
 };
 for (const session of specializedEnabled ? plan?.sessions ?? [] : []) {
  if (session.date < today) continue;
  const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
  const details = [session.block, session.title, session.sport, session.plannedMinutes === null ? '' : `${session.plannedMinutes} min`, session.prescription || part?.prescription, session.notes].filter((value): value is string => !!value);
  day(session.date).manual.push(details.map(text).join(' · '));
 }
 if (coachEnabled) for (const workout of cache?.workouts ?? []) {
  if (workout.date < today) continue;
  const details = [workout.plan, workout.name, workout.sport, workout.duration === null ? '' : `${(workout.duration / 60).toFixed(1)} min`, workout.distance === null ? '' : `${(workout.distance / 1000).toFixed(2)} km`, workout.description].filter(Boolean);
  day(workout.date).coach.push(details.map(text).join(' · '));
 }
 // Include recurring-only dates for a bounded horizon, plus every imported plan date.
 if (plan?.weeklySchedule?.length) {
  const cursor = new Date(`${today}T12:00:00Z`);
  for (let index = 0; index < 28; index++) {
   const date = cursor.toISOString().slice(0, 10);
   if (scheduleOn(plan, date, specializedEnabled).length) day(date);
   cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const [date, row] of dates) {
   row.weekly = scheduleOn(plan, date, specializedEnabled).sort((a, b) => a.time.localeCompare(b.time)).map(item =>
    [item.time, item.title, item.minutes === null ? '' : `${item.minutes} min`, item.recordedBy, item.notes].filter(Boolean).map(text).join(' · '));
  }
 }
 const columns = ['Date', 'Recurring', ...(specializedEnabled ? ['Specialized'] : []), ...(coachEnabled ? ['Garmin Coach'] : [])];
 const tableRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
 const rows = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => tableRow([
  date, row.weekly.join('<br><br>') || '—',
  ...(specializedEnabled ? [row.manual.join('<br><br>') || '—'] : []),
  ...(coachEnabled ? [row.coach.join('<br><br>') || '—'] : []),
 ]));
 const coachStatus = !coachEnabled ? '' : cache?.lastSuccess ? `Coach published range: ${text(cache.start)}–${text(cache.end)}.${cache.error ? ` ${text(cache.error)}` : ''}` : 'No Coach schedule imported yet. Connect Garmin and sync.';
 const table = [tableRow(columns), tableRow(columns.map(() => '---')), ...rows].join('\n');
 return `Today and upcoming dated plans, starting ${today}. Multiple workouts on the same date stay together. Recurring weekly training is shown for the next 28 days and on all imported upcoming plan dates. Weekly strategy remains in Plans; recorded activities remain in Log.${coachStatus ? `\n\n${coachStatus}` : ''}\n\n${table}${rows.length ? '' : '\n\nNo upcoming dated plans.'}\n\n${coachEnabled ? 'Coach sessions can change and Garmin may publish only a few days ahead. ' : ''}A blank cell means no imported plan from that source; it does not imply a rest day. Edit prescriptions in the workbook${coachEnabled ? ' or Garmin Connect' : ''}.`;
}
