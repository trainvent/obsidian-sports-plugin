import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';

/** Migrate only notes with a trusted plugin baseline; never replace a target. */
export async function migrateNoteNames(plugin: SportsPlugin): Promise<string[]> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const issues: string[] = [];
 for (const [oldName, name, id] of [['Plan.md', 'Plans.md', 'plan'], ['complete-log.md', 'Log.md', 'training-log'], ['Training log.md', 'Log.md', 'training-log'], ['Analytics.md', 'Analytics/Index.md', 'analytics']]) {
  const oldPath = normalizePath(`${plugin.data.notesFolder}/${oldName}`);
  const path = normalizePath(`${plugin.data.notesFolder}/${name}`);
  const oldKey = `${oldPath}:${id}`;
  const key = `${path}:${id}`;
  const baseline = plugin.data.generatedBlocks[oldKey];
  if (baseline === undefined) continue;
  try {
   const source = plugin.app.vault.getAbstractFileByPath(oldPath);
   const target = plugin.app.vault.getAbstractFileByPath(path);
   if (source && target) throw new Error(`Both ${oldName} and ${name} exist. Resolve the duplicate before refreshing.`);
   if (source instanceof TFile) {
    const parent = path.slice(0, path.lastIndexOf('/'));
    if (!plugin.app.vault.getAbstractFileByPath(parent)) await plugin.app.vault.createFolder(parent);
    await plugin.app.fileManager.renameFile(source, path);
   }
   else if (source) throw new Error(`${oldName} is a folder.`);
   else if (target instanceof TFile && !(await plugin.app.vault.read(target)).includes(baseline)) throw new Error(`${name} does not contain the trusted generated section from ${oldName}.`);
   // A missing source and target retain the baseline, preserving deletion protection.
   plugin.data.generatedBlocks[key] = baseline;
   delete plugin.data.generatedBlocks[oldKey];
   await plugin.save();
  } catch (error) { issues.push(`${name}: ${error instanceof Error ? error.message : 'Note migration failed.'}`); }
 }
 return issues;
}
