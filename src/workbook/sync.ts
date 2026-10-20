import { Notice } from 'obsidian';
import type SportsPlugin from '../main';
import { readLocalWorkbook } from './local-file';
import { parseWorkbook } from './parse';
import { syncNotes } from '../notes/sync';

export async function syncWorkbook(plugin: SportsPlugin): Promise<void> {
 if (plugin.syncing) return;
 plugin.syncing = true; plugin.refreshViews();
 try {
  if (!plugin.data.strategySheet && !plugin.data.trackingSheet) { new Notice('Workbook sync is disabled. Select a strategy or tracking sheet in settings to enable it.'); return; }
  const next = await parseWorkbook(await readLocalWorkbook(plugin.data.workbookPath), { strategySheet: plugin.data.strategySheet, trackingSheet: plugin.data.trackingSheet, previous: plugin.data.plan });
  const previous = plugin.data.plan;
  if (previous && previous.id !== next.id && previous.id !== 'sports-tracking-only') throw new Error('This workbook has a different plan ID. Multiple-plan switching is not supported yet.');
  for (const session of previous?.sessions ?? []) {
   if (session.status !== 'completed') continue;
   const replacement = next.sessions.find(item => item.id === session.id);
   if (replacement && (replacement.partId !== session.partId || replacement.partVersion !== session.partVersion)) throw new Error(`Completed session ${session.id}: changing its part/version is not allowed.`);
   if (replacement && replacement.date !== session.date) throw new Error(`Completed session ${session.id}: changing its date requires explicit history editing, which is not supported yet.`);
   const oldPart = previous?.parts.find(part => part.id === session.partId && part.version === session.partVersion);
   if (oldPart) {
    const newPart = next.parts.find(part => part.id === oldPart.id && part.version === oldPart.version);
    if (!newPart || JSON.stringify(oldPart) !== JSON.stringify(newPart)) throw new Error(`Part ${oldPart.id} v${oldPart.version} has completed history. Preserve it and create a new version.`);
   }
   if (!replacement) next.sessions.push(session);
  }
  plugin.data.plan = next; plugin.data.lastError = ''; await plugin.save();
  const issues = await syncNotes(plugin, next);
  if (issues.length) plugin.data.lastError = `Workbook imported; ${issues.length} note(s) need attention: ${issues[0]}`;
  await plugin.save();
  new Notice(plugin.data.lastError || 'Workbook and generated notes synced.');
 } catch (error) {
  plugin.data.lastError = error instanceof Error ? error.message : 'Sync failed.';
  await plugin.save(); new Notice(plugin.data.lastError);
 } finally { plugin.syncing = false; plugin.refreshViews(); }
}
