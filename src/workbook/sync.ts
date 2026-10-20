import { Notice } from 'obsidian';
import type SportsPlugin from '../main';
import { readLocalWorkbook } from './local-file';
import { parseWorkbook } from './parse';
import { strategyMarkdown, weekMarkdown, trainingLogMarkdown } from '../notes/render';
import { weekDates } from '../model/calendar';
import { updateNote } from '../notes/store';

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
  if (plugin.data.strategySheet) await updateNote(plugin, 'Strategy.md', 'strategy', strategyMarkdown(next), '# Training strategy\n\n## Commentary\n');
  if (plugin.data.trackingSheet) await updateNote(plugin, 'Training log.md', 'training-log', trainingLogMarkdown(next), '# Training log\n\n## Commentary\n');
  const issues: string[] = [];
  const prefix = `${plugin.data.notesFolder}/Weeks/`;
  for (const key of Object.keys(plugin.data.generatedBlocks)) {
   if (!key.startsWith(prefix)) continue;
   const date = key.slice(prefix.length).split('.md:week:')[0] ?? '';
   if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
   try {
    await updateNote(plugin, `Weeks/${date}.md`, `week:${date}`, weekMarkdown(next, plugin.data.events, weekDates(new Date(`${date}T12:00:00`))), `# Week of ${date}\n\n## Reflections\n`);
   } catch (error) { issues.push(error instanceof Error ? error.message : 'Weekly note update failed.'); }
  }
  if (issues.length) plugin.data.lastError = `Workbook imported; ${issues.length} weekly note(s) need attention: ${issues[0]}`;
  await plugin.save();
  new Notice(plugin.data.lastError || 'Workbook and generated notes synced.');
 } catch (error) {
  plugin.data.lastError = error instanceof Error ? error.message : 'Sync failed.';
  await plugin.save(); new Notice(plugin.data.lastError);
 } finally { plugin.syncing = false; plugin.refreshViews(); }
}
