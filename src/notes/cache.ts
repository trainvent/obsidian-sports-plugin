import { normalizePath, TFile, TFolder } from 'obsidian';
import type SportsPlugin from '../main';
import type { SportsData } from '../model/types';

/** Explicit reset; retain configuration and vault files. */
export function clearImportCache(data: SportsData): void {
 data.noteRecoveryPending = [...new Set([...(data.noteRecoveryPending ?? []), ...Object.keys(data.generatedBlocks)])];
 data.plan = null;
 data.garminCache = undefined;
 data.garminCoachCache = undefined;
 data.generatedBlocks = {};
 data.lastError = '';
 data.resetNoteBaselines = true;
}

export async function backupBeforeReset(plugin: SportsPlugin, path: string, content: string): Promise<void> {
 const folder = plugin.data.notesFolder;
 const relative = path.slice(folder.length + 1);
 const stamp = new Date().toISOString().replace(/[:.]/g, '-');
 const backup = normalizePath(`${folder}/Backups/${stamp}/${relative}`);
 const pieces = backup.split('/'); pieces.pop();
 let current = '';
 for (const piece of pieces) {
  current = current ? `${current}/${piece}` : piece;
  if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
 }
 await plugin.app.vault.create(backup, content);
}


/** Capture recovery scope before discarding source caches, including lost baselines. */
export async function collectRecoveryNotes(plugin: SportsPlugin): Promise<string[]> {
 const configured = plugin.data.notesFolder;
 if (!configured || configured.startsWith('/') || configured.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const folderPath = normalizePath(configured);
 const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
 const pending: string[] = [];
 if (!(folder instanceof TFolder)) return pending;
 const folders = [folder];
 while (folders.length) {
  const current = folders.pop();
  if (!current) continue;
  for (const file of current.children) {
   if (file instanceof TFolder) {
    if (file.path !== `${folderPath}/Backups`) folders.push(file);
   } else if (file instanceof TFile && file.extension === 'md') {
    const content = await plugin.app.vault.read(file);
    for (const match of content.matchAll(/<!-- sports:begin ([^\r\n]+) -->/g)) pending.push(`${file.path}:${match[1]}`);
   }
  }
 }
 return pending;
}
