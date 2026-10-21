import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';
import sheetGuide from '../../SHEET_GUIDE.md';

/** Keep a user-editable copy in the vault; never replace an existing guide. */
export async function ensureSheetGuide(plugin: SportsPlugin): Promise<void> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const path = normalizePath(`${folder}/Guide/SHEET_GUIDE.md`);
 const existing = plugin.app.vault.getAbstractFileByPath(path);
 if (existing instanceof TFile) return;
 if (existing) throw new Error(`A folder occupies ${path}.`);
 const pieces = path.split('/'); pieces.pop();
 let current = '';
 for (const piece of pieces) {
  current = current ? `${current}/${piece}` : piece;
  if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
 }
 await plugin.app.vault.create(path, sheetGuide);
}
