import { initialNoteTitle, withoutNoteTitle } from './titles';
import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';
import { backupBeforeReset } from './cache';
import { generatedBlock, mergeBlock } from './blocks';

export async function updateNote(plugin: SportsPlugin, relativePath: string, id: string, body: string, initial: string, recreateMissing = false): Promise<TFile> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const path = normalizePath(`${folder}/${relativePath}`);
 const pieces = path.split('/'); pieces.pop();
 let current = '';
 for (const piece of pieces) {
  current = current ? `${current}/${piece}` : piece;
  if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
 }
 const existing = plugin.app.vault.getAbstractFileByPath(path);
 const key = `${path}:${id}`;
 const expectedTitle = initialNoteTitle(initial) ?? (id === 'calendar' ? 'Calendar' : undefined);
 const removeGeneratedHeading = (content: string): string => {
  if (!expectedTitle) return content;
  const stripped = withoutNoteTitle(content, expectedTitle);
  // Only migrate the old title directly before this plugin's generated block.
  const prefix = stripped.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trimStart();
  return prefix.startsWith(`<!-- sports:begin ${id} -->`) ? stripped : content;
 };
 let file: TFile;
 if (existing instanceof TFile) {
  if (plugin.data.resetNoteBaselines && plugin.data.generatedBlocks[key] === undefined) {
   const snapshot = await plugin.app.vault.read(existing);
   if (/<!-- complete-(?:log|plans):start -->/.test(snapshot)) throw new Error(`${path} is managed by the existing Fitness refresh scripts. Choose a separate notes folder to avoid mixing generators.`);
   const begin = snapshot.indexOf(`<!-- sports:begin ${id} -->`);
   const endMarker = `<!-- sports:end ${id} -->`;
   const end = snapshot.indexOf(endMarker);
   const baseline = begin >= 0 && end >= begin ? snapshot.slice(begin, end + endMarker.length) : undefined;
   // Validate markers before creating a backup or changing the existing file.
   const restored = mergeBlock(snapshot, id, body, baseline);
   await backupBeforeReset(plugin, path, snapshot);
   await plugin.app.vault.process(existing, content => {
    if (content !== snapshot) throw new Error(`${path} changed during recovery. Retry sync.`);
    return removeGeneratedHeading(restored);
   });
   plugin.data.generatedBlocks[key] = generatedBlock(id, body);
   await plugin.save();
   return existing;
  }
  await plugin.app.vault.process(existing, content => {
   if (/<!-- complete-(?:log|plans):start -->/.test(content)) throw new Error(`${path} is managed by the existing Fitness refresh scripts. Choose a separate notes folder to avoid mixing generators.`);
   return removeGeneratedHeading(mergeBlock(content, id, body, plugin.data.generatedBlocks[key]));
  });
  file = existing;
 } else if (existing) throw new Error(`A folder occupies ${path}.`);
 else {
  if (plugin.data.generatedBlocks[key] !== undefined && !recreateMissing) throw new Error(`Previously generated note ${path} was removed. Use Recreate missing notes in Sports settings to restore it.`);
  // Put the generated overview after the title, with personal sections below it.
  const cleanInitial = expectedTitle ? withoutNoteTitle(initial, expectedTitle) : initial;
 const frontmatterEnd = cleanInitial.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)?.[0] ?? '';
 const boundary = frontmatterEnd ? frontmatterEnd.length : 0;
  const title = cleanInitial.slice(0, boundary);
  const commentary = cleanInitial.slice(boundary).trim();
  file = await plugin.app.vault.create(path, `${mergeBlock(title, id, body)}${commentary ? `\n${commentary}\n` : ''}`);
 }
 plugin.data.generatedBlocks[key] = generatedBlock(id, body);
 await plugin.save();
 return file;
}
