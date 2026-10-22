import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const DAY = 86_400_000;

/** Rebase our bundled template only. Imported user workbooks are never shifted. */
export function startTemplateNextMonday(template: Uint8Array, now = new Date()): ArrayBuffer {
 const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
 start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7));
 const serial = (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) - Date.UTC(1899, 11, 30)) / DAY + 0.5;
 const files = unzipSync(template);
 const strategyPath = 'xl/worksheets/sheet1.xml';
 const logPath = files['xl/worksheets/sheet3.xml'] ? 'xl/worksheets/sheet3.xml' : 'xl/worksheets/sheet2.xml';
 let strategy = strFromU8(files[strategyPath]!);
 const cellPattern = (address: string) => new RegExp(`<(?:(?:\\w+):)?c\\b(?![^>]*\\/>)[^>]*\\br="${address}"[^>]*>[\\s\\S]*?<\\/(?:(?:\\w+):)?c>`, 'g');
 const startCell = strategy.match(cellPattern('E3'))?.[0];
 const previousValue = startCell?.match(/<(?:\w+:)?v>([^<]+)<\/(?:\w+:)?v>/)?.[1];
 const epoch = Date.UTC(1899, 11, 30);
 const previous = startCell?.includes('t="d"') ? (Date.parse(previousValue ?? '') - epoch) / DAY : Number(previousValue);
 if (!startCell || !Number.isFinite(previous)) throw new Error('The example workbook has no valid start date.');
 const delta = serial - previous;
 const shift = (cell: string): string => cell.replace(/(<(?:\w+:)?v>)([^<]+)(<\/(?:\w+:)?v>)/, (_, begin: string, value: string, end: string) => {
  const shifted = cell.includes('t="d"') ? new Date(Date.parse(value) + delta * DAY).toISOString() : Number(value) + delta;
  return `${begin}${shifted}${end}`;
 });
 strategy = strategy.replace(startCell, shift(startCell));
 // Week-start and session-date formulas keep referring to the fixed start cell.
 // Update their saved values too, so the workbook imports before Excel opens it.
 strategy = strategy.replace(cellPattern('B\\d+'), cell => /<(?:\w+:)?f\b/.test(cell) ? shift(cell) : cell);
 const log = strFromU8(files[logPath]!).replace(cellPattern('A\\d+'), cell => /<(?:\w+:)?f\b/.test(cell) ? shift(cell) : cell);
 const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
 strategy = strategy.replace(cellPattern('D3'), cell => {
  const prefix = cell.match(/^<((?:\w+:)?)c\b/)![1]!;
  const attributes = cell.slice(cell.indexOf(' '), cell.indexOf('>')).replace(/\s+t="[^"]*"/, '');
  return `<${prefix}c${attributes} t="inlineStr"><${prefix}is><${prefix}t>${timezone}</${prefix}t></${prefix}is></${prefix}c>`;
 });
 files[strategyPath] = strToU8(strategy); files[logPath] = strToU8(log);
 // Scoring dates reference Daily; keep their saved values aligned before Excel opens.
 for (const path of Object.keys(files)) {
  if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path) || [strategyPath, logPath].includes(path)) continue;
  const xml = strFromU8(files[path]!);
  files[path] = strToU8(xml.replace(cellPattern('[A-Z]+\\d+'), cell => /<(?:\w+:)?f\b[^>]*>(?:'Daily'|Daily)!A\d+<\//.test(cell) ? shift(cell) : cell));
 }
 return Uint8Array.from(zipSync(files)).buffer;
}
