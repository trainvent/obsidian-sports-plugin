import type { TrainingPlan, Session } from '../model/types';
import type { GarminActivity, GarminCache } from '../garmin/types';
import { median } from '../model/daily-scores';
import { noteLink } from './plan';

export function combinedAnalyticsMarkdown(plan: TrainingPlan | null, folder: string, cache?: GarminCache, now = new Date()): string {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const sheet = new Map<string, Session[]>(), watch = new Map<string, GarminActivity[]>();
 for (const session of plan?.sessions ?? []) {
  if (session.date > today) continue;
  const entries = sheet.get(session.date) ?? []; entries.push(session); sheet.set(session.date, entries);
 }
 for (const activity of cache?.activities ?? []) {
  if (activity.date > today) continue;
  const entries = watch.get(activity.date) ?? []; entries.push(activity); watch.set(activity.date, entries);
 }
 const dates = [...new Set([...sheet.keys(), ...watch.keys()])].sort();
 const value = (n: number | null): string => n === null ? '—' : String(Math.round(n * 10) / 10);
 const total = (values: (number | null)[]): number | null => {
  const available = values.filter((n): n is number => n !== null);
  return available.length ? available.reduce((sum, n) => sum + n, 0) : null;
 };
 const minutes = dates.map(date => {
  const recorded = watch.get(date) ?? [];
  const importedEmptyDay = cache?.lastSuccess && date >= cache.start && date <= cache.end && !recorded.length;
  return `${date}\t${value(total((sheet.get(date) ?? []).map(s => s.actualMinutes)))}\t${value(importedEmptyDay ? 0 : total(recorded.map(a => a.duration === null ? null : a.duration / 60)))}`;
 });
 const intensity = dates.map(date => `${date}\t${value(median((sheet.get(date) ?? []).map(s => s.scores?.plannedIntensity)))}\t${value(median((watch.get(date) ?? []).map(a => a.average_hr !== null && a.average_hr > 0 ? a.average_hr : null)))}`);
 const chart = (header: string, rows: string[]): string => ['```sports-trend', header, ...rows, '```'].join('\n');
 return `${noteLink(folder, 'Analytics/Index', 'Analytics')} · ${noteLink(folder, 'Analytics/Sheet', 'Sheet')} · ${noteLink(folder, 'Analytics/Smartwatch', 'Smartwatch')} · ${noteLink(folder, 'Analytics/Daily/Index', 'Daily')}\n\n## Recorded training minutes\n\n${chart('Date\tSheet minutes\tSmartwatch minutes', minutes)}\n\nEach source has its own line on the same time axis. Sheet minutes use explicitly recorded actual duration; smartwatch minutes sum recorded activity durations. Missing durations are omitted, so daily totals may be partial. The lines are not added: the same workout may appear in both sources. Zero smartwatch minutes means no activities were recorded within the imported range; dates outside that range stay unrecorded.\n\n## Intensity and heart rate\n\n${chart('Date\tPlanned intensity (0–10)\tWatch heart rate (bpm)', intensity)}\n\nSheet intensity uses the left 0–10 axis. The right axis shows the daily median of available activity-average heart rates, in bpm. These are separate indicators in different units, not a shared intensity score or matched workouts. Missing values leave gaps.\n\nOpen ${noteLink(folder, 'Analytics/Sheet', 'Sheet')} for performance and effort, ${noteLink(folder, 'Analytics/Smartwatch', 'Smartwatch')} for pace and sport-specific graphs, or ${noteLink(folder, 'Analytics/Daily/Index', 'Daily')} for the underlying sessions and activities.`;
}
