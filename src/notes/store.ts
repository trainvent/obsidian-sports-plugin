import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';
import { generatedBlock, mergeBlock } from './blocks';

export async function updateNote(plugin: SportsPlugin, relativePath: string, id: string, body: string, initial: string): Promise<TFile> {
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
 let file: TFile;
 if (existing instanceof TFile) {
  await plugin.app.vault.process(existing, content => mergeBlock(content, id, body, plugin.data.generatedBlocks[key]));
  file = existing;
 } else if (existing) throw new Error(`A folder occupies ${path}.`);
 else {
  if (plugin.data.generatedBlocks[key] !== undefined) throw new Error(`Previously generated note ${path} was removed. It has not been recreated.`);
  // Put the generated overview after the title, with personal sections below it.
  const boundary = initial.indexOf('\n\n');
  const title = boundary < 0 ? initial : initial.slice(0, boundary);
  const commentary = boundary < 0 ? '' : initial.slice(boundary).trim();
  file = await plugin.app.vault.create(path, `${mergeBlock(title, id, body)}${commentary ? `\n${commentary}\n` : ''}`);
 }
 plugin.data.generatedBlocks[key] = generatedBlock(id, body);
 await plugin.save();
 return file;
}
