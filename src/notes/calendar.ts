import type { TrainingPlan } from '../model/types';
import type { CoachCache } from '../garmin/coach';
import { garminToday } from '../garmin/normalize';

function text(value: string): string {
 return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}

/** A date groups sources without implying that two prescriptions are the same workout. */
export function calendarMarkdown(plan: TrainingPlan | null, coachEnabled: boolean | undefined, cache?: CoachCache, now = new Date()): string {
 const today = garminToday(plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, now);
 const dates = new Map<string, { manual: string[]; coach: string[] }>();
 const day = (date: string) => {
  let row = dates.get(date);
  if (!row) { row = { manual: [], coach: [] }; dates.set(date, row); }
  return row;
 };
 for (const session of plan?.sessions ?? []) {
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
 const rows = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => `| ${date} | ${row.manual.join('<br><br>') || '—'} | ${row.coach.join('<br><br>') || '—'} |`);
 const coachStatus = !coachEnabled ? 'Garmin Coach plans are hidden. Enable Show Garmin Coach plans to include them.' : cache?.lastSuccess ? `Coach last synced: ${text(cache.lastSuccess)}. Published range: ${text(cache.start)}–${text(cache.end)}.${cache.error ? ` ${text(cache.error)}` : ''}` : 'No Coach schedule imported yet. Connect Garmin and sync.';
 return `Today and upcoming dated plans, starting ${today}. Multiple workouts on the same date stay together. Weekly strategy remains in Plans; recorded activities remain in Log.\n\n${coachStatus}\n\n| Date | XLSX daily plans | Garmin Coach plans |\n| --- | --- | --- |\n${rows.length ? rows.join('\n') : '| — | No upcoming dated plans | — |'}\n\nCoach sessions can change and Garmin may publish only a few days ahead. A blank cell means no imported plan from that source; it does not imply a rest day. Edit prescriptions in the workbook or Garmin Connect.`;
}
