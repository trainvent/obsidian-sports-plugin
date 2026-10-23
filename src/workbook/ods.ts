import { Parser } from 'saxen';
import type { SheetData } from './sheet-data';
import { odsValue } from './ods-values';

import type { WorkbookSheet } from './sheet-data';
const MAX_ROWS = 100_000, MAX_COLUMNS = 16_384, MAX_CELLS = 1_000_000;
const repeat = (raw: string | undefined, max: number): number => {
 const value = raw === undefined ? 1 : Number(raw);
 if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error('ODS repetition exceeds the supported workbook limits.');
 return value;
};

/** Namespace-aware ODS value reader, with bounded expansion of sparse rows/cells. */
export function readOds(xml: string, selected: Set<string>): WorkbookSheet[] {
 if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('ODS documents with XML document types or entities are unsupported.');
 const parser = new Parser();
 parser.ns({
  'urn:oasis:names:tc:opendocument:xmlns:office:1.0': 'office',
  'urn:oasis:names:tc:opendocument:xmlns:table:1.0': 'table',
  'urn:oasis:names:tc:opendocument:xmlns:text:1.0': 'text',
 });
 const sheets: WorkbookSheet[] = [], stack: string[] = [];
 let sheet: WorkbookSheet | undefined, active = false, spreadsheet = false, cells = 0, tableDepth = 0, roots = 0;
 let row: SheetData[number] | undefined, rowRepeat = 1, emptyRows = 0, emptyColumns = 0;
 let cell: { attrs: Record<string, string>; text: string; repeat: number; covered: boolean; paragraphs: number } | undefined;
 let paragraph = 0, annotation = 0;
 const fail = (): never => { throw new Error('Invalid ODS spreadsheet XML.'); };
 parser.on('error', fail); parser.on('warn', fail);
 parser.on('openTag', (name, getAttrs, decode) => {
  const parent = stack.at(-1);
  if (!stack.length && (name !== 'office:document-content' || roots++ > 0)) fail();
  stack.push(name);
  if (stack.length > 128) fail();
  if (name === 'office:spreadsheet' && parent === 'office:body') spreadsheet = true;
  if (name === 'table:table' && spreadsheet) {
   if (sheet) { if (active) throw new Error('Nested ODS tables are unsupported.'); return; }
   const attrs = getAttrs();
   const title = decode(attrs['table:name'] ?? '');
   if (!title || sheets.some(s => s.sheet === title)) throw new Error('ODS sheet names must be nonempty and unique.');
   sheet = { sheet: title, data: [] }; sheets.push(sheet);
   active = selected.has(title); emptyRows = 0; tableDepth = stack.length;
   return;
  }
  if (!active) return;
  const attrs = Object.fromEntries(Object.entries(getAttrs()).map(([key, value]) => [key, decode(value)]));
  if (name === 'table:table-row') {
   if (row) fail();
   row = []; rowRepeat = repeat(attrs['table:number-rows-repeated'], 1_048_576); emptyColumns = 0;
  } else if ((name === 'table:table-cell' || name === 'table:covered-table-cell') && row) {
   if (cell) fail();
   cell = { attrs, text: '', repeat: repeat(attrs['table:number-columns-repeated'], MAX_COLUMNS), covered: name === 'table:covered-table-cell', paragraphs: 0 };
  } else if (cell) {
   if (name === 'office:annotation') annotation++;
   if (name === 'text:p' && !annotation) { if (cell.paragraphs++) cell.text += '\n'; paragraph++; }
   if (paragraph && !annotation) {
    if (name === 'text:line-break') cell.text += '\n';
    if (name === 'text:tab') cell.text += '\t';
    if (name === 'text:s') cell.text += ' '.repeat(repeat(attrs['text:c'], 10_000));
   }
  }
 });
 const appendText = (value: string): void => { if (cell && paragraph && !annotation) cell.text += value; };
 parser.on('text', (value, decode) => appendText(decode(value)));
 parser.on('cdata', appendText);
 parser.on('closeTag', name => {
  if (stack.pop() !== name) fail();
  if (active && sheet) {
   if ((name === 'table:table-cell' || name === 'table:covered-table-cell') && cell && row) {
    const value = cell.covered ? null : odsValue(cell.attrs, cell.text);
    if (row.length + emptyColumns + cell.repeat > MAX_COLUMNS) throw new Error('ODS sheet exceeds the supported column limit.');
    if (value === null || value === '') emptyColumns += cell.repeat;
    else {
     if (cells + emptyColumns + cell.repeat > MAX_CELLS) throw new Error('ODS sheet expands beyond the supported cell limit.');
     row.push(...Array<null>(emptyColumns).fill(null));
     for (let index = 0; index < cell.repeat; index++) row.push(value);
     cells += emptyColumns + cell.repeat; emptyColumns = 0;
    }
    cell = undefined; paragraph = 0; annotation = 0;
   } else if (name === 'text:p' && !annotation) paragraph--;
   else if (name === 'office:annotation') annotation--;
   else if (name === 'table:table-row' && row) {
    if (!row.length) emptyRows += rowRepeat;
    else {
     if (sheet.data.length + emptyRows + rowRepeat > MAX_ROWS || cells + row.length * (rowRepeat - 1) + emptyRows > MAX_CELLS) throw new Error('ODS sheet expands beyond the supported row/cell limits.');
     for (let index = 0; index < emptyRows; index++) sheet.data.push([]);
     for (let index = 0; index < rowRepeat; index++) sheet.data.push([...row]);
     cells += row.length * (rowRepeat - 1) + emptyRows; emptyRows = 0;
    }
    row = undefined;
   }
  }
  if (name === 'table:table' && stack.length === tableDepth - 1) { sheet = undefined; active = false; }
  if (name === 'office:spreadsheet') spreadsheet = false;
 });
 parser.parse(xml);
 if (stack.length || !sheets.length) fail();
 return sheets;
}
