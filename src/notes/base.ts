import { normalizePath, TFile } from 'obsidian';
import type SportsPlugin from '../main';

/** A user-owned view over existing note properties, never a second data store. */
export function sportsBase(folder: string): string {
 const filter = (expression: string): string => JSON.stringify(expression);
 return `filters:
  and:
    - ${filter('file.ext == "md"')}
    - ${filter(`file.inFolder(${JSON.stringify(folder)})`)}
    - not:
        - ${filter(`file.inFolder(${JSON.stringify(`${folder}/Backups`)})`)}
properties:
  file.name:
    displayName: Note
  note.week_start:
    displayName: Start
  note.week_end:
    displayName: End
  note.program_week:
    displayName: Program week
  note.phase:
    displayName: Phase
  note.targets:
    displayName: Goals
views:
  - type: table
    name: Weeks
    filters: ${filter(`file.folder == ${JSON.stringify(`${folder}/Weeks`)}`)}
    order:
      - file.name
      - note.week_end
      - note.program_week
      - note.phase
    sort:
      - property: note.week_start
        direction: DESC
  - type: table
    name: Routines
    filters:
      and:
        - ${filter(`file.folder == ${JSON.stringify(`${folder}/Routines`)}`)}
        - ${filter(`file.path != ${JSON.stringify(`${folder}/Routines/_Index.md`)}`)}
    order:
      - file.name
      - note.targets
    sort:
      - property: file.name
        direction: ASC
`;
}

/** Create once; sorting, columns and filters belong to the user after creation. */
export async function ensureSportsBase(plugin: SportsPlugin): Promise<void> {
 const folder = plugin.data.notesFolder;
 if (!folder || folder.startsWith('/') || folder.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('Choose a normal vault folder for Sports notes.');
 const path = normalizePath(`${folder}/Sports.base`);
 const existing = plugin.app.vault.getAbstractFileByPath(path);
 if (existing instanceof TFile) return;
 if (existing) throw new Error(`A folder occupies ${path}.`);
 let current = '';
 for (const piece of folder.split('/')) {
  current = current ? `${current}/${piece}` : piece;
  if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
 }
 await plugin.app.vault.create(path, sportsBase(folder));
}
