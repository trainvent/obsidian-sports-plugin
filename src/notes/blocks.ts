export function mergeBlock(existing: string, id: string, body: string, previous?: string): string {
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
  /(^## Recorded Garmin activities\r?\n\r?\nLast successful sync: )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z(?=\. Imported )/gm, '$1<refresh-time>');
 const recovered = previous === undefined && withoutRefreshTime(current) === withoutRefreshTime(block);
 if (!recovered && (previous === undefined || current !== previous)) throw new Error('The generated section was edited or has no trusted baseline. The note was preserved.');
 return existing.slice(0, start) + block + existing.slice(finish + end.length);
}
export function generatedBlock(id: string, body: string): string {
 return `<!-- sports:begin ${id} -->\n${body.trim()}\n<!-- sports:end ${id} -->`;
}
export function cell(value: string | number | null | undefined): string {
 return String(value ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}
