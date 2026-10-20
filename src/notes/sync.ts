import type SportsPlugin from '../main';
import type { TrainingPlan } from '../model/types';
import { weekDates } from '../model/calendar';
import { updateNote } from './store';
import { strategyMarkdown, trainingLogMarkdown, weekMarkdown } from './render';
import { noteLink, plannedWeeks, planMarkdown } from './plan';

export async function syncNotes(plugin: SportsPlugin, plan: TrainingPlan): Promise<string[]> {
 const folder = plugin.data.notesFolder;
 const weeks = new Set(plannedWeeks(plan));
 const prefix = `${folder}/Weeks/`;
 for (const key of Object.keys(plugin.data.generatedBlocks)) {
  if (!key.startsWith(prefix)) continue;
  const date = key.slice(prefix.length).split('.md:week:')[0] ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) weeks.add(date);
 }
 const ordered = [...weeks].sort();
 const tasks = [
  { path: 'Plan.md', id: 'plan', body: planMarkdown(plan, folder, ordered), initial: '# Training plan\n\n## Reflections\n' },
  ...(plugin.data.strategySheet ? [{ path: 'Strategy.md', id: 'strategy', body: strategyMarkdown(plan), initial: '# Training strategy\n\n## Commentary\n' }] : []),
  ...(plugin.data.trackingSheet ? [{ path: 'complete-log.md', id: 'training-log', body: `${noteLink(folder, 'Plan', 'Training plan')}\n\n${trainingLogMarkdown(plan)}`, initial: '# Complete log\n\n## Reflections\n' }] : []),
  ...(plugin.data.generatedBlocks[`${folder}/Training log.md:training-log`] !== undefined ? [{ path: 'Training log.md', id: 'training-log', body: trainingLogMarkdown(plan), initial: '# Training log\n' }] : []),
  ...ordered.map(date => ({ path: `Weeks/${date}.md`, id: `week:${date}`, body: `${noteLink(folder, 'Plan', 'Training plan')} · ${noteLink(folder, 'complete-log', 'Complete log')}\n\n${weekMarkdown(plan, plugin.data.events, weekDates(new Date(`${date}T12:00:00`)))}`, initial: `# Week of ${date}\n\n## Weekly review\n\n### What improved\n\n### Recovery and comfort\n\n### Repeat or progress\n\n### What to adjust\n` })),
 ];
 const issues: string[] = [];
 for (const task of tasks) {
  try { await updateNote(plugin, task.path, task.id, task.body, task.initial); }
  catch (error) { issues.push(`${task.path}: ${error instanceof Error ? error.message : 'Note update failed.'}`); }
 }
 return issues;
}
