import { syncCoachOnlyPlans } from '../notes/coach-plans';
import { Notice } from 'obsidian';
import type SportsPlugin from '../main';
import { syncWorkbook } from '../workbook/sync';
import { syncGarmin } from './sync';
import { syncNotes } from '../notes/sync';
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
  if (!plugin.data.plan) await updateNote(plugin, 'Log.md', 'training-log', combinedLogMarkdown(null, plugin.data.garminCache), '# Log\n\n## Reflections\n');
  await syncCoachOnlyPlans(plugin);
  if (plugin.data.showGarminCoachPlans && plugin.data.garminCoachCache?.error) new Notice(plugin.data.garminCoachCache.error);
  if (issues.length) new Notice(issues[0]!);
  if (plugin.data.garminCache?.error) new Notice(plugin.data.garminCache.error);
 } catch { new Notice('Could not refresh Garmin notes. Existing notes were preserved.'); }
 finally { plugin.syncing = false; plugin.refreshViews(); }
}
