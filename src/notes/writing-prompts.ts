const PROMPTS = new Set(['Reflections', 'Commentary', 'My workbook choices', 'Review', 'Progress and observations', 'Adjustments', 'Next review', 'What improved', 'Recovery and comfort', 'Repeat or progress', 'What to adjust', "Next week's focus"]);

/** Seed empty personal prompts only; never touch generated content or written notes. */
export function starterBullets(content: string): string {
 const lines = content.split('\n');
 let generated = false, fence = '';
 for (let index = 0; index < lines.length; index++) {
  const line = lines[index]!;
  if (line.includes('<!-- sports:begin ')) generated = true;
  if (line.includes('<!-- sports:end ')) { generated = false; continue; }
  if (generated) continue;
  const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
  if (marker) { if (!fence) fence = marker; else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ''; continue; }
  if (fence) continue;
  const heading = /^(#{2,3}) (.+?)\s*$/.exec(line);
  if (!heading || !PROMPTS.has(heading[2]!)) continue;
  let next = index + 1;
  while (next < lines.length && !lines[next]!.trim()) next++;
  // Compact a lone empty starter too, without touching a written list.
  if (/^[-*+]\s*$/.test(lines[next] ?? '')) {
   next++;
   while (next < lines.length && !lines[next]!.trim()) next++;
  }
  const following = lines[next];
  const nextHeading = following && /^(#{1,6}) /.exec(following);
  if (following !== undefined && (!nextHeading || nextHeading[1]!.length > heading[1]!.length)) continue;
  lines.splice(index + 1, next - index - 1, '- ');
  index++;

 }
 return lines.join('\n').replace(/\n- $/, '\n- \n');
}
