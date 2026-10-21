import { withoutNoteTitle } from './titles';
import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';
import sheetGuide from '../../Workbook.md';

/** Keep a user-editable copy in the vault; never replace an existing guide. */
export async function ensureSheetGuide(plugin: SportsPlugin): Promise<void> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const path = normalizePath(`${folder}/Guide/Workbook.md`);
 let existing = plugin.app.vault.getAbstractFileByPath(path);
 const legacy = plugin.app.vault.getAbstractFileByPath(normalizePath(`${folder}/Guide/SHEET_GUIDE.md`));
 if (!existing && legacy instanceof TFile) {
  await plugin.app.fileManager.renameFile(legacy, path);
  existing = legacy;
 }
 if (existing instanceof TFile) {
  await plugin.app.vault.process(existing, content => withoutNoteTitle(content, 'Adapting the Sports workbook'));
  return;
 }
 if (existing) throw new Error(`A folder occupies ${path}.`);
 const pieces = path.split('/'); pieces.pop();
 let current = '';
 for (const piece of pieces) {
  current = current ? `${current}/${piece}` : piece;
  if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
 }
 await plugin.app.vault.create(path, withoutNoteTitle(sheetGuide));
}
