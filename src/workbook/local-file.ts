import { homedir } from 'node:os';
import * as paths from 'node:path';
import { open, mkdir } from 'node:fs/promises';
import { Platform } from 'obsidian';

// Desktop-only plugin; sync reads only the explicitly configured workbook.
const MAX_BYTES = 5 * 1024 * 1024;

/** Access only the desktop workbook path explicitly configured by the user. */
export async function workbookLocation(input: string): Promise<string> {
 if (!Platform.isDesktop) throw new Error('Local workbooks outside the vault require Obsidian desktop. Cached notes remain available.');
 let path = input.trim();
 if (/^[a-z][a-z\d+.-]*:\/\//i.test(path)) throw new Error('Template creation needs a local .xlsx path. Cloud links are read-only.');
 if (path.startsWith('~/') || path.startsWith('~\\')) path = paths.join(homedir(), path.slice(2));
 if (!paths.isAbsolute(path)) throw new Error('Choose an absolute workbook path or one beginning with ~/. Vault-relative paths are no longer used.');
 if (!path.toLowerCase().endsWith('.xlsx')) throw new Error('Choose a file ending in .xlsx.');
 return paths.normalize(path);
}

export async function readLocalWorkbook(input: string): Promise<ArrayBuffer> {
 if (!Platform.isDesktop) throw new Error('Local workbook sync requires Obsidian desktop.');
 const path = await workbookLocation(input);
 const handle = await open(path, 'r');
 try {
  const before = await handle.stat();
  if (!before.isFile()) throw new Error('The workbook path must point to a file.');
  if (before.size > MAX_BYTES) throw new Error('Workbook exceeds the prototype limit of 5 MB.');
  const bytes = new Uint8Array(MAX_BYTES + 1);
  let length = 0;
  while (length < bytes.length) {
   const { bytesRead } = await handle.read(bytes, length, bytes.length - length, null);
   if (!bytesRead) break;
   length += bytesRead;
  }
  const after = await handle.stat();
  if (length > MAX_BYTES) throw new Error('Workbook exceeds the prototype limit of 5 MB.');
  if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new Error('Workbook changed while reading. Save it and sync again.');
  return bytes.slice(0, length).buffer;
 } finally { await handle.close(); }
}

/** Explicit template creation only; sync never calls this or overwrites a workbook. */
export async function createLocalTemplate(input: string, bytes: ArrayBuffer): Promise<void> {
 if (!Platform.isDesktop) throw new Error('Local template creation requires Obsidian desktop.');
 const path = await workbookLocation(input);
 await mkdir(paths.dirname(path), { recursive: true });
 const handle = await open(path, 'wx');
 try { await handle.writeFile(new Uint8Array(bytes)); }
 finally { await handle.close(); }
}
