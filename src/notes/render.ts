import type { TrainingPlan, RecurringEvent } from '../model/types';
import { eventsOn } from '../model/calendar';
import { cell } from './blocks';

export function strategyMarkdown(plan: TrainingPlan): string {
 const goals = plan.goals.map(goal => `- **${cell(goal.title)}**${goal.benchmark ? ` — ${cell(goal.benchmark)}` : ''}`).join('\n');
 const parts = plan.parts.map(part => `### ${cell(part.title)} (v${cell(part.version)})\n\n${part.prescription}\n\nGoals: ${part.goalIds.map(id => cell(plan.goals.find(goal => goal.id === id)?.title ?? id)).join(', ')}`).join('\n\n');
 return `## ${cell(plan.name)}\n\n### Goals\n\n${goals}\n\n${parts}`;
}
export function weekMarkdown(plan: TrainingPlan | null, events: RecurringEvent[], dates: string[]): string {
 const rows = dates.flatMap(date => {
  const sessions = (plan?.sessions ?? []).filter(session => session.date === date).map(session => {
   const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
   return `| ${date} | ${cell(session.title)} | ${cell(part?.title ?? session.sport)} | ${cell(session.plannedMinutes)} | ${cell(session.actualMinutes)} | ${cell(session.status)} | ${cell(session.result)} |`;
  });
  return [...sessions, ...eventsOn(events, date).map(event => `| ${date} | ${cell(event.time)} ${cell(event.title)} | ${cell(event.sport)} | ${event.minutes} | — | Scheduled | — |`)];
 });
 return `## Training overview\n\n| Date | Session | Part / sport | Planned min | Actual min | Status | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nTimes follow the source schedule. Tracker connections are not available in this prototype.`;
}
