import type { TrainingPlan, RecurringEvent } from '../model/types';
import { eventsOn, scheduleOn } from '../model/calendar';
import { cell } from './blocks';

export function strategyMarkdown(plan: TrainingPlan): string {
 const goals = plan.goals.map(goal => `- **${cell(goal.title)}**${goal.benchmark ? ` — ${cell(goal.benchmark)}` : ''}`).join('\n');
 const parts = plan.parts.map(part => `### ${cell(part.title)} (v${cell(part.version)})\n\n${part.prescription}\n\nGoals: ${part.goalIds.map(id => cell(plan.goals.find(goal => goal.id === id)?.title ?? id)).join(', ')}`).join('\n\n');
 const schedule = (plan.weeklySchedule ?? []).map(item => `| ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.weekday]} | ${cell(item.time)} | ${cell(item.title)} | ${cell(item.minutes)} | ${cell(item.recordedBy)} | ${cell(item.notes)} |`).join('\n');
 return `## ${cell(plan.name)}\n\n### Goals\n\n${goals}\n\n${parts}\n\n### Weekly schedule — no manual results\n\n| Day | Time | Activity | Minutes | Recorded by | Notes |\n| --- | --- | --- | --- | --- | --- |\n${schedule || "No regular activities entered yet."}`;
}
export function weekMarkdown(plan: TrainingPlan | null, events: RecurringEvent[], dates: string[]): string {
 const rows = dates.flatMap(date => {
  const sessions = (plan?.sessions ?? []).filter(session => session.date === date).map(session => {
   const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
   return `| ${date} | ${cell(session.title)} | ${cell(part?.title ?? session.sport)} | ${cell(session.plannedMinutes)} | ${cell(session.actualMinutes)} | ${cell(session.status)} | ${cell(session.result)} | ${cell(session.prescription ?? '')} | ${cell(session.notes)} |`;
  });
  return [...sessions, ...scheduleOn(plan, date).map(item => `| ${date} | ${cell(item.time)} ${cell(item.title)} | Weekly schedule | ${cell(item.minutes)} | — | Planned | — | ${cell(item.recordedBy)} | ${cell(item.notes)} |`), ...eventsOn(events, date).map(event => `| ${date} | ${cell(event.time)} ${cell(event.title)} | ${cell(event.sport)} | ${event.minutes} | — | Scheduled | — | — | — |`)];
 });
 return `## Training overview\n\n| Date | Session | Part / sport | Planned min | Actual min | Status | Result | Plan | Notes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nTimes follow the source schedule. Tracker connections are not available in this prototype.`;
}
