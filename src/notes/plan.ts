import type { TrainingPlan } from '../model/types';
import { weekDates } from '../model/calendar';
import { groupedGoals } from './goals';
import { cell } from './blocks';

export function noteLink(folder: string, path: string, label: string): string {
 return `[[${folder}/${path}|${label}]]`;
}

/** Create notes for every explicitly dated week and the current calendar week. */
export function plannedWeeks(plan: TrainingPlan, anchor = new Date()): string[] {
 return [...new Set([
  weekDates(anchor)[0]!,
  ...plan.sessions.map(session => weekDates(new Date(`${session.date}T12:00:00`))[0]!),
  ...(plan.weekPlans ?? []).map(week => week.start),
 ])].sort();
}

export function weeklyStrategy(plan: TrainingPlan | null, start: string): string {
 const week = plan?.weekPlans?.find(week => week.start === start);
 if (!week) return '';
 return `## Week ${week.week} · ${cell(week.phase)}\n\n**Focus:** ${cell(week.focus)}\n\n**Targets:** ${cell(week.targets) || 'Not set'}\n\n**Advance when:** ${cell(week.advanceWhen) || 'Review before progressing'}\n\n**Time budget:** ${cell(week.minutes)} min\n\n${Object.entries(week.blocks ?? {}).map(([block, prescription]) => `**${cell(block)}:** ${cell(prescription)}\n\n`).join('')}`;
}

export function planMarkdown(plan: TrainingPlan, folder: string, weeks: string[]): string {
 const goals = groupedGoals(plan.goals, true, folder);
 const rows = weeks.map(start => {
  const week = plan.weekPlans?.find(week => week.start === start);
  return `| ${noteLink(folder, `Weeks/${start}`, start).replace('|', '\\|')} | ${week?.week ?? '—'} | ${cell(week?.phase ?? '') || '—'} | ${cell(week?.focus ?? '') || '—'} | ${cell(week?.targets ?? '') || '—'} |`;
 });
 return `${noteLink(folder, 'Calendar', 'Calendar')} · ${noteLink(folder, 'Log', 'Log')} · ${noteLink(folder, 'Strategy', 'Strategy and exercise guide')}\n\n## Starting point and goals\n\n${goals}\n\n## Weekly plan\n\n| Week starting | Program week | Phase | Focus | Targets |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nEdit plans and record results in the workbook. Write your reflections outside the generated sections. Each week is a proposal to review before progressing.`;
}
