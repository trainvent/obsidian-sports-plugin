import { goalNoteLink } from './goal-files';
import type { Goal, GoalCategory } from '../model/types';
import { cell } from './blocks';

const GROUPS: [GoalCategory, string][] = [
 ['milestone', 'Aspiration'],
 ['maintenance', 'Maintenance'],
];

export function groupedGoals(goals: Goal[], table = false, folder?: string): string {
 return GROUPS.flatMap(([category, title]) => {
  const selected = goals.filter(goal => (goal.category ?? 'milestone') === category);
  if (!selected.length) return [];
  const body = table
   ? `| Goal | Starting level | Goal level | Test standard |\n| --- | --- | --- | --- |\n${selected.map(goal => `| ${cell(folder ? goalNoteLink(goal, folder) : goal.title)} | ${cell(goal.baseline ?? '') || 'Not recorded'} | ${cell(goal.benchmark)} | ${cell(goal.test ?? '') || 'Not set'} |`).join('\n')}`
   : selected.map(goal => `- **${folder ? goalNoteLink(goal, folder) : cell(goal.title)}**${goal.benchmark ? ` — ${cell(goal.benchmark)}` : ''}`).join('\n');
  return [`### ${title}\n\n${body}`];
 }).join('\n\n');
}
