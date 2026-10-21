import type { TrainingPlan, Session } from '../model/types';
import type { GarminActivity, GarminCache } from '../garmin/types';
import { activityDetails } from '../garmin/activities';

function text(value: string | number): string {
 return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\\`*[\]_]/g, '\\$&').replaceAll('|', '&#124;').replace(/[\r\n]+/g, '<br>');
}

/** Join by local calendar date, keeping every manual session and tracker activity distinct. */
export function combinedLogMarkdown(plan: TrainingPlan | null, cache?: GarminCache, now = new Date()): string {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const manual = new Map<string, Session[]>();
 for (const session of plan?.sessions ?? []) {
  const entries = manual.get(session.date) ?? []; entries.push(session); manual.set(session.date, entries);
 }
 const recordedByDate = new Map<string, GarminActivity[]>();
 for (const activity of cache?.activities ?? []) {
  const entries = recordedByDate.get(activity.date) ?? []; entries.push(activity); recordedByDate.set(activity.date, entries);
 }
 const dates = [...new Set([...manual.keys(), ...recordedByDate.keys()])].filter(date => date <= today).sort().reverse();
 const status = cache ? `${cache.lastSuccess ? `Garmin last synced: ${text(cache.lastSuccess)}. Imported dates: ${text(cache.start)}–${text(cache.end)}.` : 'Garmin has not been imported yet.'}${cache.error ? `\n\n${text(cache.error)} Cached activities are retained.` : ''}\n\n` : '';
 if (!dates.length) return `${status}No log entries for today or earlier.`;
 const rows = dates.map(date => {
  const sessions = manual.get(date) ?? [];
  const label = (session: Session): string => `**${text(session.block || session.title)}${session.block && session.block !== session.title ? ` · ${text(session.title)}` : ''}**`;
  const plans = sessions.map(session => {
   const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
   return [label(session), text(session.prescription ?? part?.prescription ?? ''), ...(session.plannedMinutes !== null ? [`Planned: ${text(session.plannedMinutes)} min`] : [])].filter(Boolean).join('<br>');
  });
  const results = sessions.map(session => [
   ...(sessions.length > 1 ? [label(session)] : []),
   `Status: ${text(session.status)}`,
   ...(session.actualMinutes !== null ? [`Actual: ${text(session.actualMinutes)} min`] : []),
   ...(session.result ? [text(session.result)] : []),
  ].join('<br>'));
  const notes = sessions.filter(session => session.notes).map(session => `${sessions.length > 1 ? `${label(session)}<br>` : ''}${text(session.notes)}`);
  const activities = (recordedByDate.get(date) ?? []).sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  const recorded = activities.map(activity => `[${text(activity.name)}](https://connect.garmin.com/modern/activity/${activity.id}) · ${text(activityDetails(activity))}`).join('<br>');
  const missing = cache?.lastSuccess && date >= cache.start && date <= cache.end ? 'None recorded' : 'Not imported';
  return `| ${date} | ${plans.join('<br><br>') || '—'} | ${results.join('<br><br>') || '—'} | ${recorded || missing} | ${notes.join('<br><br>') || '—'} |`;
 });
 return `${status}## Recent and recorded\n\n| Date | Manual plan | Manual results | Garmin activities | Manual notes |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nGarmin records do not mark manual sessions complete.`;
}
