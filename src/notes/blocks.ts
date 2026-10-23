import { canonicalNoteLinks } from './renames';
import { compactAnalyticsCopy } from './analytics-copy';

export function mergeBlock(existing: string, id: string, body: string, previous?: string, folder?: string): string {
 const begin = `<!-- sports:begin ${id} -->`;
 const end = `<!-- sports:end ${id} -->`;
 const block = `${begin}\n${body.trim()}\n${end}`;
 const start = existing.indexOf(begin);
 const finish = existing.indexOf(end);
 if (start === -1 && finish === -1) {
  if (previous !== undefined) throw new Error('Generated markers were removed. Restore the markers before refreshing this note.');
  return `${existing.trimEnd()}\n\n${block}\n`;
 }
 if (start === -1 || finish < start || existing.indexOf(begin, start + begin.length) !== -1 || existing.indexOf(end, finish + end.length) !== -1) {
  throw new Error('Generated markers are incomplete or duplicated. The note was preserved.');
 }
 const current = existing.slice(start, finish + end.length);
 // Already-current output needs no overwrite, even if the saved baseline is stale.
 if (current === block) return existing;
 // Rebuild a lost baseline only when source-derived output is identical apart from
 // Garmin's refresh timestamp. Content, imported range, and warnings must still match.
 const withoutRefreshTime = (value: string): string => value.replace(
  /(^## Recorded Garmin activities\r?\n\r?\n)Last successful sync: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\. (?=Imported )/gm, '$1');
 const recovered = previous === undefined && withoutRefreshTime(current) === withoutRefreshTime(block);
 const rewrittenLinks = previous !== undefined && folder !== undefined && canonicalNoteLinks(current, folder) === canonicalNoteLinks(previous, folder);
 const compactedCopy = ['analytics-graph','analytics-combined','analytics-smartwatch'].includes(id) && previous !== undefined &&
  compactAnalyticsCopy(folder ? canonicalNoteLinks(current,folder) : current) === compactAnalyticsCopy(folder ? canonicalNoteLinks(previous,folder) : previous);
 // Obsidian's table editor pads cells and expands separator dashes. Compare
 // Calendar tables semantically against the trusted baseline, never new output.
 const formattedCalendar = id === 'calendar' && previous !== undefined && calendarFormatting(current, folder) === calendarFormatting(previous, folder);
 if (!recovered && !rewrittenLinks && !formattedCalendar && !compactedCopy && (previous === undefined || current !== previous)) throw new Error('The generated section was edited or has no trusted baseline. The note was preserved.');
 return existing.slice(0, start) + block + existing.slice(finish + end.length);
}
function calendarFormatting(content: string, folder?: string): string {
 const linked = folder === undefined ? content : canonicalNoteLinks(content, folder);
 return linked.split('\n').map(line => {
  if (!line.startsWith('|') || !line.endsWith('|')) return line;
  return line.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/^(:?)-{3,}(:?)$/, '$1---$2')).join('|');
 }).join('\n');
}
export function generatedBlock(id: string, body: string): string {
 return `<!-- sports:begin ${id} -->\n${body.trim()}\n<!-- sports:end ${id} -->`;
}
export function cell(value: string | number | null | undefined): string {
 return String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}
