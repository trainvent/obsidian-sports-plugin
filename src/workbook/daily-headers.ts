import type { SheetData } from './sheet-data';
import { cellText } from './daily-log';

/** A heading only applies to the consecutive tracking subcolumns beneath it. */
export function dailyHeaders(rows: SheetData, first: number): string[] {
 const groups = first > 0 ? rows[first - 1]!.map(cellText) : [];
 let group = '';
 const headers = rows[first]!.map(cellText).map((header, column) => {
  if (groups[column]) group = groups[column]!;
  if (!['Done', 'Rounds'].includes(header) && !/^[1-9]\d*$/.test(header)) { group = ''; return header; }
  if (!group) return header;
  if (header === 'Done') return `${group} done`;
  return `${group} ${header === 'Rounds' ? 'rounds' : header} result`;
 });
 while (headers.length && !headers[headers.length - 1]) headers.pop();
 return headers;
}
