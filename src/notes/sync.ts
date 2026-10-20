import type SportsPlugin from '../main';
import type { TrainingPlan } from '../model/types';
import { weekDates } from '../model/calendar';
import { updateNote } from './store';
import { strategyMarkdown, datedLogMarkdown, weekMarkdown } from './render';
import { migrateNoteNames } from './migrate';
import { noteLink, plannedWeeks, planMarkdown } from './plan';

export async function syncNotes(plugin: SportsPlugin, plan: TrainingPlan, recreateMissing = false): Promise<string[]> {
 const migrationIssues = await migrateNoteNames(plugin);
 const folder = plugin.data.notesFolder;
 const weeks = new Set(plannedWeeks(plan));
 const prefix = `${folder}/Weeks/`;
 for (const key of Object.keys(plugin.data.generatedBlocks)) {
  if (!key.startsWith(prefix)) continue;
  const date = key.slice(prefix.length).split('.md:week:')[0] ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && plugin.app.vault.getAbstractFileByPath(`${folder}/Weeks/${date}.md`)) weeks.add(date);
 }
 const ordered = [...weeks].sort();
 const tasks = [
  { path: 'Plans.md', id: 'plan', body: `${planMarkdown(plan, folder, ordered)}\n\n${datedLogMarkdown(plan, true)}`, initial: '# Plans\n\n## Reflections\n' },
  ...(plugin.data.strategySheet ? [{ path: 'Strategy.md', id: 'strategy', body: strategyMarkdown(plan), initial: '# Training strategy\n\n## Commentary\n' }] : []),
  ...(plugin.data.trackingSheet ? [{ path: 'Log.md', id: 'training-log', body: `${noteLink(folder, 'Plans', 'Plans')}\n\n${datedLogMarkdown(plan, false)}`, initial: '# Log\n\n## Reflections\n' }] : []),
  ...ordered.map(date => ({ path: `Weeks/${date}.md`, id: `week:${date}`, body: `${noteLink(folder, 'Plans', 'Plans')} · ${noteLink(folder, 'Log', 'Log')}\n\n${weekMarkdown(plan, plugin.data.events, weekDates(new Date(`${date}T12:00:00`)), plugin.data.showRegularActivities)}`, initial: `# Week of ${date}\n\n## Weekly review\n\n### What improved\n\n### Recovery and comfort\n\n### Repeat or progress\n\n### What to adjust\n` })),
 ];
 const issues: string[] = [...migrationIssues];
 for (const task of tasks) {
  if (migrationIssues.some(issue => issue.startsWith(`${task.path}:`))) continue;
  try { await updateNote(plugin, task.path, task.id, task.body, task.initial, recreateMissing); }
  catch (error) { issues.push(`${task.path}: ${error instanceof Error ? error.message : 'Note update failed.'}`); }
 }
 if (!issues.length && plugin.data.resetNoteBaselines) { plugin.data.resetNoteBaselines = false; await plugin.save(); }
 return issues;
}
