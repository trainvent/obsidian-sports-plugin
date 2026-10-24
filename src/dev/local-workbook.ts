import { Platform } from 'obsidian';
import type { DataAdapter } from 'obsidian';

type WorkbookAdapter = Pick<DataAdapter, 'readBinary'>;
const overrides = new WeakMap<WorkbookAdapter, string>();

/** Memory only: reload clears the override; released builds never import this module. */
export function setLocalWorkbook(adapter: WorkbookAdapter, input: string): void {
 const path = input.trim();
 if (!path) { overrides.delete(adapter); return; }
 if (!Platform.isDesktop) throw new Error('Local workbook debugging requires desktop.');
 if (path.startsWith('/') || path.includes('\\') || path.split('/').some(piece => !piece || piece === '..' || piece.startsWith('.')) || /^[a-z]+:/i.test(path)) throw new Error('Enter a workbook path relative to this vault.');
 if (!/\.(xlsx|ods)$/i.test(path)) throw new Error('Choose an XLSX or ODS workbook.');
 overrides.set(adapter, path);
}

export function hasLocalWorkbook(adapter: WorkbookAdapter): boolean { return overrides.has(adapter); }

export async function readLocalWorkbook(adapter: WorkbookAdapter): Promise<ArrayBuffer | undefined> {
 const path = overrides.get(adapter);
 if (!path) return undefined;
 if (!Platform.isDesktop) throw new Error('Local workbook debugging requires desktop.');
 const bytes = await adapter.readBinary(path);
 if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Local workbook exceeds the limit of 5 MB.');
 return bytes;
}

export function localWorkbookPath(adapter: WorkbookAdapter): string { return overrides.get(adapter) ?? ''; }
