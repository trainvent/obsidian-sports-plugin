import type { TrainingPlan, Session } from '../model/types';
import type { GarminCache, GarminActivity } from '../garmin/types';
import { garminMarkdown } from '../garmin/render';
import { compactResults, performanceMarkdown, safeText } from './performance';
import { sessionScoreSummary } from './session-scores';
import { noteLink } from './plan';

function dailyEntries(plan: TrainingPlan | null, cache: GarminCache | undefined, now: Date) {
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
 return { dates: [...new Set([...sheet.keys(), ...watch.keys()])].sort().reverse(), sheet, watch };
}

function sheetSession(session: Session, plan: TrainingPlan | null): string {
 const part = plan?.parts.find(p => p.id === session.partId && p.version === session.partVersion);
 const minutes = [session.plannedMinutes !== null ? `Planned: ${session.plannedMinutes} min` : '', session.actualMinutes !== null ? `Actual: ${session.actualMinutes} min` : ''].filter(Boolean).join(' · ');
 const scores = sessionScoreSummary(session);
 const prescription = session.prescription ?? part?.prescription;
 const summary = compactResults(session);
 return `### ${safeText(session.title)}${session.block && session.block !== session.title ? ` · ${safeText(session.block)}` : ''}\n\nStatus: ${safeText(session.status)}${minutes ? ` · ${minutes}` : ''}${scores ? `\n\n${scores}` : ''}${prescription ? `\n\n**Plan**\n\n${safeText(prescription)}` : ''}${summary ? `\n\n**Recorded summary:** ${safeText(summary)}` : ''}${performanceMarkdown(session)}${session.notes ? `\n\n**Session notes**\n\n${safeText(session.notes)}` : ''}`;
}

export function dailyIndexMarkdown(plan: TrainingPlan | null, folder: string, cache?: GarminCache, now = new Date()): string {
 const { dates, sheet, watch } = dailyEntries(plan, cache, now);
 const links = dates.map(date => {
  const sessions = sheet.get(date)?.length ?? 0;
  const activities = watch.get(date)?.length ?? 0;
  return `- ${noteLink(folder, `Analytics/Daily/${date}`, date)} — ${sessions} sheet session${sessions === 1 ? '' : 's'}, ${activities} smartwatch activit${activities === 1 ? 'y' : 'ies'}`;
 });
 return `${noteLink(folder, 'Log', 'Log')} · ${noteLink(folder, 'Analytics/_Index', 'Analytics')}\n\n## Daily notes\n\n${links.join('\n') || 'No logged dates yet.'}\n\nEach day combines its sheet sessions, scores, sets, and recorded Garmin activities. Only today and earlier dates with source entries get notes; upcoming sessions remain in Plans. Reflections below stay here when this index refreshes.`;
}

export function dailyNoteTasks(plan: TrainingPlan | null, folder: string, cache?: GarminCache, now = new Date()): { path: string; id: string; body: string; initial: string }[] {
 const { dates, sheet, watch } = dailyEntries(plan, cache, now);
 return dates.map((date, i) => {
  const sessions = sheet.get(date) ?? [];
  const dayCache = cache ? { ...cache, activities: watch.get(date) ?? [] } : undefined;
  const navigation = [noteLink(folder, 'Log', 'Log'), noteLink(folder, 'Analytics/Daily/_Index', 'All days'), noteLink(folder, 'Analytics/Smartwatch', 'Smartwatch graphs')];
  if (dates[i + 1]) navigation.push(noteLink(folder, `Analytics/Daily/${dates[i + 1]}`, 'Older day'));
  if (dates[i - 1]) navigation.push(noteLink(folder, `Analytics/Daily/${dates[i - 1]}`, 'Newer day'));
  return {
   path: `Analytics/Daily/${date}.md`, id: `day:${date}`,
   body: `${navigation.join(' · ')}\n\n## Sheet sessions\n\n${sessions.map(s => sheetSession(s, plan)).join('\n\n') || 'No sheet sessions for this date.'}${garminMarkdown(dayCache) || '\n\n## Recorded Garmin activities\n\nNo smartwatch data imported.'}\n\nSheet completion and Garmin recordings remain independent.`,
   initial: `# ${date}\n\n## Reflections\n`,
  };
 });
}
