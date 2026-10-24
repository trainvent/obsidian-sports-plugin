import { sessionDetails, safeText, compactResults } from './performance';
import type { TrainingPlan } from '../model/types';
import { groupedGoals } from './goals';
import { weekMarkdown } from './week';
export { weekMarkdown };
import { cell } from './blocks';

export function strategyMarkdown(plan: TrainingPlan, folder?: string): string {
 const goals = groupedGoals(plan.goals, false, folder);
 const parts = plan.parts.map(part => `### ${cell(part.title)} (v${cell(part.version)})\n\n${part.prescription}\n\nSupports: ${part.goalIds.map(id => cell(plan.goals.find(goal => goal.id === id)?.title ?? id)).join(', ') || 'General training'}`).join('\n\n');
 const arsenal = (plan.exerciseArsenal ?? []).map(item => `| ${cell(item.group)} | ${cell(item.exercise)} |`).join('\n');
 const schedule = (plan.weeklySchedule ?? []).map(item => `| ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item.weekday]} | ${cell(item.time)} | ${cell(item.title)} | ${cell(item.minutes)} | ${cell(item.recordedBy)} | ${cell(item.notes)} |`).join('\n');
 return `## ${cell(plan.name)}\n\n${goals}\n\n${parts}\n\n### Weekly schedule — no manual results\n\n| Day | Time | Activity | Minutes | Recorded by | Notes |\n| --- | --- | --- | --- | --- | --- |\n${schedule || "No regular activities entered yet."}${arsenal ? `\n\n### Exercise arsenal\n\n| Group | Exercise |\n| --- | --- |\n${arsenal}` : ''}${plan.equipment?.length ? `\n\n### Equipment\n\n| Equipment | Load range (kg) | Notes |\n| --- | --- | --- |\n${plan.equipment.map(item => `| ${cell(item.name)} | ${item.maxKg === null ? item.minKg > 0 ? `${item.minKg}+` : '—' : `${item.minKg}–${item.maxKg}`} | ${cell(item.notes)} |`).join('\n')}` : ''}${plan.recap?.length ? `\n\n### Plan recap\n\n| Prompt | Response |\n| --- | --- |\n${plan.recap.map(item => `| ${cell(item.prompt)} | ${cell(item.response)} |`).join('\n')}` : ''}`;
}
/** Four columns retain the full source schedule; exercise detail grows vertically. */
export function trainingLogMarkdown(plan: TrainingPlan | null, planningOnly = false, includeDetails = true): string {
 const sessions = [...(plan?.sessions ?? [])].sort((left, right) => left.date.localeCompare(right.date));
 if (!sessions.length) return 'No training log entries imported yet. Select the second sheet under Tracking sheet in Sports settings, then select Sync now.';
 const rows = sessions.map(session => {
  const part = plan?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
  const description = [session.block, session.title, session.sport].filter(Boolean).map(value => safeText(value!)).join(' · ');
  const prescription = safeText(session.prescription ?? part?.prescription ?? '');
  if (planningOnly) return `| ${cell(session.date)} | **${description}**<br>${prescription} | ${cell(session.plannedMinutes)} | ${cell(session.notes)} |`;
  const results = [safeText(session.status), `Minutes: ${cell(session.plannedMinutes)} planned / ${cell(session.actualMinutes)} actual`, safeText(compactResults(session))].filter(Boolean).join('<br>');
  return `| ${cell(session.date)} | **${description}**<br>${prescription} | ${results} | ${cell(session.notes)} |`;
 });
 const details = planningOnly || !includeDetails ? [] : sessions.map(sessionDetails).filter(Boolean);
 return `## Imported schedule\n\n${planningOnly ? '| Date | Training and plan | Planned min | Notes |' : '| Date | Training and plan | Results | Notes |'}\n| --- | --- | --- | --- |\n${rows.join('\n')}${details.length ? `\n\n## Sets and comparisons\n\n${details.join('\n\n')}` : ''}`;
}

/** Split the manual log at today in the strategy's timezone. */
export function datedLogMarkdown(plan: TrainingPlan | null, upcoming: boolean, now = new Date()): string {
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: plan?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
 const sessions = (plan?.sessions ?? []).filter(session => upcoming ? session.date > today : session.date <= today);
 if (!sessions.length) return upcoming ? 'No upcoming manual sessions.' : 'No training log entries for today or earlier.';
 const markdown = trainingLogMarkdown(plan ? { ...plan, sessions } : null, upcoming);
 if (upcoming) return markdown;
 // Reverse only schedule rows; exercise cards retain their complete block structure.
 const lines = markdown.split('\n');
 const start = lines.findIndex(line => /^\| \d{4}-/.test(line));
 let end = start;
 while (end >= 0 && /^\| \d{4}-/.test(lines[end] ?? '')) end++;
 if (start >= 0) lines.splice(start, end - start, ...lines.slice(start, end).reverse());
 return lines.join('\n');
}
