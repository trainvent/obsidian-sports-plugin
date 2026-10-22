import { sessionDetails, safeText, compactResults } from './performance';
import type { TrainingPlan } from '../model/types';
import { scheduleOn } from '../model/calendar';
import { groupedGoals } from './goals';
import { weeklyStrategy } from './plan';
import { cell } from './blocks';

export function strategyMarkdown(plan: TrainingPlan, folder?: string): string {
 const goals = groupedGoals(plan.goals, false, folder);
 const parts = plan.parts.map(part => `### ${cell(part.title)} (v${cell(part.version)})\n\n${part.prescription}\n\nSupports: ${part.goalIds.map(id => cell(plan.goals.find(goal => goal.id === id)?.title ?? id)).join(', ') || 'General training'}`).join('\n\n');
 const arsenal = (plan.exerciseArsenal ?? []).map(item => `| ${cell(item.group)} | ${cell(item.exercise)} |`).join('\n');
 const schedule = (plan.weeklySchedule ?? []).map(item => `| ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.weekday]} | ${cell(item.time)} | ${cell(item.title)} | ${cell(item.minutes)} | ${cell(item.recordedBy)} | ${cell(item.notes)} |`).join('\n');
 return `## ${cell(plan.name)}\n\n${goals}\n\n${parts}\n\n### Weekly schedule — no manual results\n\n| Day | Time | Activity | Minutes | Recorded by | Notes |\n| --- | --- | --- | --- | --- | --- |\n${schedule || "No regular activities entered yet."}${arsenal ? `\n\n### Exercise arsenal\n\n| Group | Exercise |\n| --- | --- |\n${arsenal}` : ''}`;
}
export function weekMarkdown(plan: TrainingPlan | null, dates: string[], showRegularActivities = false): string {
 const sessions = (plan?.sessions ?? []).filter(session => dates.includes(session.date));
 const selected = plan ? { ...plan, sessions } : null;
 const regular = showRegularActivities ? dates.flatMap(date => scheduleOn(plan, date).map(item => `- ${date} · ${safeText(item.time)} ${safeText(item.title)} · ${cell(item.minutes)} min · ${safeText(item.recordedBy)}${item.notes ? ` · ${safeText(item.notes)}` : ''}`)) : [];
 return `${weeklyStrategy(plan, dates[0] ?? '')}## Training overview\n\n${trainingLogMarkdown(selected)}${regular.length ? `\n\n### Weekly schedule · Planned\n\n${regular.join('\n')}` : ''}\n\nTimes follow the source schedule. Manual completion is recorded separately from tracker activities.`;
}

/** Four columns retain the full source schedule; exercise detail grows vertically. */
export function trainingLogMarkdown(plan: TrainingPlan | null): string {
 const sessions = [...(plan?.sessions ?? [])].sort((left, right) => left.date.localeCompare(right.date));
 if (!sessions.length) return 'No training log entries imported yet. Select the second sheet under Tracking sheet in Sports settings, then select Sync now.';
 const rows = sessions.map(session => {
  const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
  const description = [session.block, session.title, session.sport].filter(Boolean).map(value => safeText(value!)).join(' · ');
  const prescription = safeText(session.prescription ?? part?.prescription ?? '');
  const results = [safeText(session.status), `Minutes: ${cell(session.plannedMinutes)} planned / ${cell(session.actualMinutes)} actual`, safeText(compactResults(session))].filter(Boolean).join('<br>');
  return `| ${cell(session.date)} | **${description}**<br>${prescription} | ${results} | ${cell(session.notes)} |`;
 });
 const details = sessions.map(sessionDetails).filter(Boolean);
 return `## Imported schedule\n\n| Date | Training and plan | Results | Notes |\n| --- | --- | --- | --- |\n${rows.join('\n')}${details.length ? `\n\n## Sets and comparisons\n\n${details.join('\n\n')}` : ''}`;
}

/** Split the manual log at today in the strategy's timezone. */
export function datedLogMarkdown(plan: TrainingPlan | null, upcoming: boolean, now = new Date()): string {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const sessions = (plan?.sessions ?? []).filter(session => upcoming ? session.date > today : session.date <= today);
 if (!sessions.length) return upcoming ? 'No upcoming manual sessions.' : 'No training log entries for today or earlier.';
 const markdown = trainingLogMarkdown(plan ? { ...plan, sessions } : null);
 if (upcoming) return markdown;
 // Reverse only schedule rows; exercise cards retain their complete block structure.
 const lines = markdown.split('\n');
 const start = lines.findIndex(line => /^\| \d{4}-/.test(line));
 let end = start;
 while (end >= 0 && /^\| \d{4}-/.test(lines[end] ?? '')) end++;
 if (start >= 0) lines.splice(start, end - start, ...lines.slice(start, end).reverse());
 return lines.join('\n');
}
