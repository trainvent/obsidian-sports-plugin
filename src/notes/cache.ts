import { normalizePath } from 'obsidian';
import type SportsPlugin from '../main';
import type { SportsData } from '../model/types';

/** Explicit reset; retain configuration, recurring activities, and vault files. */
export function clearImportCache(data: SportsData): void {
 data.plan = null;
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
