import { syncCoachOnlyPlans } from '../notes/coach-plans';
import { Notice } from 'obsidian';
import type SportsPlugin from '../main';
import { syncWorkbook } from '../workbook/sync';
import { syncGarmin } from './sync';
import { syncNotes } from '../notes/sync';
import { analyticsNoteTasks } from '../notes/analytics';
import { migrateNoteNames } from '../notes/migrate';
import { reconcileNoteWarning } from '../notes/warnings';
import { updateNote } from '../notes/store';
import { combinedLogMarkdown } from '../notes/combined-log';

export async function syncSources(plugin: SportsPlugin, forceGarmin: boolean): Promise<void> {
 if (plugin.syncing) return;
 // Workbook failures are reported by its importer and must not block the tracker.
 if (plugin.data.strategySheet || plugin.data.trackingSheet || plugin.data.scheduleSheet) await syncWorkbook(plugin);
 if (!plugin.data.garminEnabled) return;
 plugin.syncing = true; plugin.refreshViews();
 try {
  await syncGarmin(plugin, forceGarmin);
  const issues = plugin.data.plan ? await syncNotes(plugin, plugin.data.plan) : [];
  if (!plugin.data.plan) {
   issues.push(...await migrateNoteNames(plugin));
   await updateNote(plugin, 'Analytics/Log.md', 'training-log', combinedLogMarkdown(null, plugin.data.garminCache, new Date(), plugin.data.notesFolder), '# Log\n\n## Reflections\n');
   for (const task of analyticsNoteTasks(null, plugin.data.notesFolder, plugin.data.garminCache)) {
    if (issues.some(issue => issue.startsWith(`${task.path}:`))) continue;
    try { await updateNote(plugin, task.path, task.id, task.body, task.initial); }
    catch (error) { issues.push(`${task.path}: ${error instanceof Error ? error.message : 'Note update failed.'}`); }
   }
  }
  await syncCoachOnlyPlans(plugin);
  const warning = reconcileNoteWarning(plugin.data.lastError, issues);
  if (warning !== plugin.data.lastError) { plugin.data.lastError = warning; await plugin.save(); }
  if (plugin.data.showGarminCoachPlans && plugin.data.garminCoachCache?.error) new Notice(plugin.data.garminCoachCache.error);
  if (issues.length) new Notice(issues[0]!);
  if (plugin.data.garminCache?.error) new Notice(plugin.data.garminCache.error);
 } catch { new Notice('Could not refresh Garmin notes. Existing notes were preserved.'); }
 finally { plugin.syncing = false; plugin.refreshViews(); }
}
