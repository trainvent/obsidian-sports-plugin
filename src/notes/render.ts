import type { TrainingPlan, RecurringEvent } from '../model/types';
import { eventsOn, scheduleOn } from '../model/calendar';
import { groupedGoals } from './goals';
import { weeklyStrategy } from './plan';
import { cell } from './blocks';

export function strategyMarkdown(plan: TrainingPlan): string {
 const goals = groupedGoals(plan.goals);
 const parts = plan.parts.map(part => `### ${cell(part.title)} (v${cell(part.version)})\n\n${part.prescription}\n\nSupports: ${part.goalIds.map(id => cell(plan.goals.find(goal => goal.id === id)?.title ?? id)).join(', ') || 'General training'}`).join('\n\n');
 const arsenal = (plan.exerciseArsenal ?? []).map(item => `| ${cell(item.group)} | ${cell(item.exercise)} |`).join('\n');
 const schedule = (plan.weeklySchedule ?? []).map(item => `| ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.weekday]} | ${cell(item.time)} | ${cell(item.title)} | ${cell(item.minutes)} | ${cell(item.recordedBy)} | ${cell(item.notes)} |`).join('\n');
 return `## ${cell(plan.name)}\n\n${goals}\n\n${parts}\n\n### Weekly schedule — no manual results\n\n| Day | Time | Activity | Minutes | Recorded by | Notes |\n| --- | --- | --- | --- | --- | --- |\n${schedule || "No regular activities entered yet."}${arsenal ? `\n\n### Exercise arsenal\n\n| Group | Exercise |\n| --- | --- |\n${arsenal}` : ''}`;
}
export function weekMarkdown(plan: TrainingPlan | null, events: RecurringEvent[], dates: string[], showRegularActivities = false): string {
 const rows = dates.flatMap(date => {
  const sessions = (plan?.sessions ?? []).filter(session => session.date === date).map(session => {
   const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
   return `| ${date} | ${cell(session.title)} | ${cell(part?.title ?? session.sport)} | ${cell(session.plannedMinutes)} | ${cell(session.actualMinutes)} | ${cell(session.status)} | ${cell(session.result)} | ${cell(session.prescription ?? '')} | ${cell(session.notes)} |`;
  });
  return [...sessions, ...(showRegularActivities ? scheduleOn(plan, date) : []).map(item => `| ${date} | ${cell(item.time)} ${cell(item.title)} | Weekly schedule | ${cell(item.minutes)} | — | Planned | — | ${cell(item.recordedBy)} | ${cell(item.notes)} |`), ...(showRegularActivities ? eventsOn(events, date) : []).map(event => `| ${date} | ${cell(event.time)} ${cell(event.title)} | ${cell(event.sport)} | ${event.minutes} | — | Scheduled | — | — | — |`)];
 });
 return `${weeklyStrategy(plan, dates[0] ?? '')}## Training overview\n\n| Date | Session | Part / sport | Planned min | Actual min | Status | Result | Plan | Notes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nTimes follow the source schedule. Manual completion is recorded separately from tracker activities.`;
}

/** Show the complete imported second-sheet schedule, including dates outside this week. */
export function trainingLogMarkdown(plan: TrainingPlan | null): string {
 const sessions = [...(plan?.sessions ?? [])].sort((left, right) => left.date.localeCompare(right.date));
 if (!sessions.length) return 'No training log entries imported yet. Select the second sheet under Tracking sheet in Sports settings, then select Sync now.';
 const rows = sessions.map(session => {
  const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
  return `| ${cell(session.date)} | ${cell(session.block ?? session.title)} | ${cell(session.title)} | ${cell(session.prescription ?? part?.prescription ?? '')} | ${cell(session.sport)} | ${cell(session.plannedMinutes)} | ${cell(session.actualMinutes)} | ${cell(session.status)} | ${cell(session.result)} | ${cell(session.notes)} |`;
 });
 return `## Imported schedule\n\n| Date | Block / session | Training | Plan | Sport | Planned min | Actual min | Status | Results and completion | Notes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}`;
}

/** Split the manual log at today in the strategy's timezone. */
export function datedLogMarkdown(plan: TrainingPlan | null, upcoming: boolean, now = new Date()): string {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const sessions = (plan?.sessions ?? []).filter(session => upcoming ? session.date > today : session.date <= today);
 if (!sessions.length) return upcoming ? 'No upcoming manual sessions.' : 'No training log entries for today or earlier.';
 const selected = plan ? { ...plan, sessions } : null;
 const markdown = trainingLogMarkdown(selected);
 if (upcoming) return markdown;
 const lines = markdown.split('\n');
 const rows = lines.splice(4).reverse();
 return [...lines, ...rows].join('\n');
}
