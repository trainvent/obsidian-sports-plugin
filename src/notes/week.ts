import type { TrainingPlan } from '../model/types';
import { scheduleOn } from '../model/calendar';
import { safeText, compactResults, performanceMarkdown } from './performance';

const callout = (kind: string, title: string, body: string): string => `> [!${kind}] ${title}\n${body.split('\n').map(line => `> ${line}`).join('\n')}`;
const dayLabel = (date: string): string => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function weekMarkdown(plan: TrainingPlan | null, dates: string[], showRegularActivities = false): string {
 const sessions = (plan?.sessions ?? []).filter(session => dates.includes(session.date));
 const strategy = plan?.weekPlans?.find(week => week.start === dates[0]);
 const heading = 'Week';
 const focus = strategy ? callout('tip', 'This week’s focus', [
  safeText(strategy.focus),
  strategy.targets ? `\n**Targets** · ${safeText(strategy.targets)}` : '',
  strategy.minutes !== null ? `\n**Time budget** · ${strategy.minutes} min` : '',
 ].filter(Boolean).join('\n')) : '';
 const rows = dates.map(date => {
  const manual = sessions.filter(s => s.date === date);
  const regular = showRegularActivities ? scheduleOn(plan, date) : [];
  const titles = [...manual.map(s => safeText(s.title)), ...regular.map(s => `${safeText(s.time)} ${safeText(s.title)} · recurring`)];
  const durations = [...manual.map(s => s.plannedMinutes), ...regular.map(s => s.minutes)];
  const minutes = durations.filter((n): n is number => n !== null);
  const duration = !durations.length ? '—' : minutes.length ? `${minutes.reduce((sum, n) => sum + n, 0)}${minutes.length < durations.length ? ' + ?' : ''}` : '—';
  return `| [[#${date}\\|${dayLabel(date)}]] | ${titles.join('<br>') || '—'} | ${duration} |`;
 });
 const days = dates.map(date => {
  const manual = sessions.filter(s => s.date === date);
  const regular = showRegularActivities ? scheduleOn(plan, date) : [];
  if (!manual.length && !regular.length) return `### ${date}\n\n_No sessions planned._`;
  const cards = manual.map(session => {
   const part = plan?.parts.find(p => p.id === session.partId && p.version === session.partVersion);
   const metadata = [session.sport, session.status, session.plannedMinutes === null ? '' : `${session.plannedMinutes} min planned`, session.actualMinutes === null ? '' : `${session.actualMinutes} min recorded`].filter(Boolean).map(safeText).join(' · ');
   const prescription = session.prescription || part?.prescription || '';
   const details = performanceMarkdown(session, false).trim();
   return `${callout('note', safeText(session.title), `${metadata}${prescription ? `\n\n${prescription.split('\n').map(line => safeText(line)).join('\n\n')}` : ''}${session.notes ? `\n\n${safeText(session.notes)}` : ''}`)}${details ? `\n\n${callout('example-', 'Sets and comparisons', details)}` : ''}${(session.result || Object.values(session.results ?? {}).some(Boolean) || Object.values(session.checks ?? {}).some(value => value === true)) && compactResults(session) ? `\n\n**Results** · ${safeText(compactResults(session))}` : ''}`;
  });
  const recurring = regular.map(item => callout('abstract', `${safeText(item.time)} ${safeText(item.title)}`, `Planned · ${item.minutes === null ? '—' : item.minutes} min · ${safeText(item.recordedBy)}${item.notes ? `\n\n${safeText(item.notes)}` : ''}`));
  return `### ${date}\n\n${[...cards, ...recurring].join('\n\n')}`;
 }).filter(Boolean);
 const blocks = Object.entries(strategy?.blocks ?? {}).map(([name, prescription]) => `**${safeText(name)}** · ${safeText(prescription)}`).join('\n\n');
 return `## ${heading}\n\n${focus}\n\n## At a glance\n\n| Day | Training | Planned min |\n| --- | --- | --- |\n${rows.join('\n')}\n\n${blocks ? `${callout('info-', 'Strategy reference', blocks)}\n\n` : ''}## Day by day\n\n${days.join('\n\n') || 'No sessions planned for these dates.'}`;
}
