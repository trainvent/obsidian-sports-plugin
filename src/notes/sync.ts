import { calendarMarkdown } from './calendar';
import { coachPlansMarkdown } from './coach-plans';
import { goalNoteTask } from './goal-notes';
import { combinedLogMarkdown } from './combined-log';
import { garminMarkdown } from '../garmin/render';
import type SportsPlugin from '../main';
import type { TrainingPlan } from '../model/types';
import { weekDates } from '../model/calendar';
import { ensureSheetGuide } from './sheet-guide';
import { updateNote } from './store';
import { strategyMarkdown, datedLogMarkdown, weekMarkdown } from './render';
import { migrateNoteNames } from './migrate';
import { noteLink, plannedWeeks, planMarkdown } from './plan';

export async function syncNotes(plugin: SportsPlugin, plan: TrainingPlan, recreateMissing = false): Promise<string[]> {
 const migrationIssues = await migrateNoteNames(plugin);
 const folder = plugin.data.notesFolder;
 const weeks = new Set(plannedWeeks(plan));
 for (const activity of plugin.data.garminCache?.activities ?? []) weeks.add(weekDates(new Date(`${activity.date}T12:00:00`))[0]!);
 const prefix = `${folder}/Weeks/`;
 for (const key of Object.keys(plugin.data.generatedBlocks)) {
  if (!key.startsWith(prefix)) continue;
  const date = key.slice(prefix.length).split('.md:week:')[0] ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && plugin.app.vault.getAbstractFileByPath(`${folder}/Weeks/${date}.md`)) weeks.add(date);
 }
 const ordered = [...weeks].sort();
 const tasks = [
  { path: 'Calendar.md', id: 'calendar', body: `${noteLink(folder, 'Plans', 'Plans')} · ${noteLink(folder, 'Log', 'Log')}\n\n${calendarMarkdown(plan, plugin.data.showGarminCoachPlans, plugin.data.garminCoachCache)}`, initial: '# Calendar\n\n## Reflections\n' },
  ...plan.goals.map(goal => goalNoteTask(goal, plan, plugin.data.garminCache, folder)),
  { path: 'Plans.md', id: 'plan', body: `${planMarkdown(plan, folder, ordered)}\n\n${datedLogMarkdown(plan, true)}${coachPlansMarkdown(plugin.data.showGarminCoachPlans, plugin.data.garminCoachCache, plan.timezone)}`, initial: '# Plans\n\n## Reflections\n' },
  ...((plugin.data.strategySheet || plugin.data.scheduleSheet) ? [{ path: 'Strategy.md', id: 'strategy', body: strategyMarkdown(plan, folder), initial: '# Training strategy\n\n## Commentary\n' }] : []),
  ...((plugin.data.trackingSheet || plugin.data.garminCache) ? [{ path: 'Log.md', id: 'training-log', body: `${noteLink(folder, 'Plans', 'Plans')}\n\n${combinedLogMarkdown(plan, plugin.data.garminCache)}`, initial: '# Log\n\n## Reflections\n' }] : []),
  ...ordered.map(date => ({ path: `Weeks/${date}.md`, id: `week:${date}`, body: `${noteLink(folder, 'Plans', 'Plans')} · ${noteLink(folder, 'Log', 'Log')}\n\n${weekMarkdown(plan, weekDates(new Date(`${date}T12:00:00`)), plugin.data.showRegularActivities)}${garminMarkdown(plugin.data.garminCache, weekDates(new Date(`${date}T12:00:00`)))}`, initial: `# Week of ${date}\n\n## Weekly review\n\n### What improved\n\n### Recovery and comfort\n\n### Repeat or progress\n\n### What to adjust\n` })),
 ];
 const issues: string[] = [...migrationIssues];
 try { await ensureSheetGuide(plugin); }
 catch (error) { issues.push(`Guide/SHEET_GUIDE.md: ${error instanceof Error ? error.message : 'Guide creation failed.'}`); }
 for (const task of tasks) {
  if (migrationIssues.some(issue => issue.startsWith(`${task.path}:`))) continue;
  try { await updateNote(plugin, task.path, task.id, task.body, task.initial, recreateMissing); }
  catch (error) { issues.push(`${task.path}: ${error instanceof Error ? error.message : 'Note update failed.'}`); }
 }
 if (!issues.length && plugin.data.resetNoteBaselines) { plugin.data.resetNoteBaselines = false; await plugin.save(); }
 return issues;
}
