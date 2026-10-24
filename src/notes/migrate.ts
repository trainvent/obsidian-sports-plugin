import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';
import { NOTE_RENAMES, canonicalNoteLinks } from './renames';

/** Migrate only notes with a trusted plugin baseline; never replace a target. */
export async function migrateNoteNames(plugin: SportsPlugin): Promise<string[]> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const issues: string[] = [];
 const days: [string,string,string][] = Object.keys(plugin.data.generatedBlocks).flatMap(key => {
  const oldFolder = ['Days', 'Analytics/Daily'].find(name => key.startsWith(`${folder}/${name}/`));
  if (!oldFolder) return [];
  const prefix = `${folder}/${oldFolder}/`;
  const match = /^(\d{4}-\d{2}-\d{2})\.md:day:\1$/.exec(key.slice(prefix.length));
  return match ? [[`${oldFolder}/${match[1]}.md`, `Analytics/Days/${match[1]}.md`, `day:${match[1]}`]] : [];
 });
 for (const [oldName, name, id] of [...NOTE_RENAMES, ...days]) {
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
    let directory = '';
    for (const piece of parent.split('/')) {
     directory = directory ? `${directory}/${piece}` : piece;
     if (!plugin.app.vault.getAbstractFileByPath(directory)) await plugin.app.vault.createFolder(directory);
    }
    await plugin.app.fileManager.renameFile(source, path);
   }
   else if (source) throw new Error(`${oldName} is a folder.`);
   else if (target instanceof TFile && !canonicalNoteLinks(await plugin.app.vault.read(target), folder).includes(canonicalNoteLinks(baseline, folder))) throw new Error(`${name} does not contain the trusted generated section from ${oldName}.`);
   // A missing source and target retain the baseline, preserving deletion protection.
   plugin.data.generatedBlocks[key] = baseline;
   delete plugin.data.generatedBlocks[oldKey];
   plugin.data.noteRecoveryPending = plugin.data.noteRecoveryPending?.map(pending => pending === oldKey ? key : pending) ?? [];
   await plugin.save();
  } catch (error) { issues.push(`${name}: ${error instanceof Error ? error.message : 'Note migration failed.'}`); }
 }
 for (const oldName of ['Days', 'Analytics/Daily']) {
  const directory = plugin.app.vault.getAbstractFileByPath(normalizePath(`${folder}/${oldName}`));
  if (directory && 'children' in directory && Array.isArray(directory.children) && !directory.children.length) {
   try { await plugin.app.fileManager.trashFile(directory); }
   catch (error) { issues.push(`${oldName}: ${error instanceof Error ? error.message : 'Empty folder cleanup failed.'}`); }
  }
 }
 return issues;
}
