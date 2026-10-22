export const NOTE_RENAMES = [
 ['Plan.md', 'Plans.md', 'plan'],
 ['complete-log.md', 'Log.md', 'training-log'],
 ['Training log.md', 'Log.md', 'training-log'],
 ['Analytics.md', 'Analytics/Index.md', 'analytics'],
 ['Analytics/Daily.md', 'Analytics/Daily/Index.md', 'analytics-daily'],
] as const;

/** Obsidian may rewrite these exact plugin-owned targets while moving notes.
 * Keep aliases, anchors, prose, and every other link significant for edit detection.
 */
export function canonicalNoteLinks(content: string, folder: string): string {
 const paths = new Map<string, string>();
 for (const [oldName, name] of NOTE_RENAMES) {
  paths.set(`${folder}/${oldName}`, `${folder}/${name}`);
  paths.set(`${folder}/${oldName.slice(0, -3)}`, `${folder}/${name.slice(0, -3)}`);
 }
 return content.replace(/\[\[([^\]\r\n]+)\]\]/g, (link: string, inner: string) => {
  const pipe = inner.indexOf('|');
  const divider = pipe < 0 ? inner.length : pipe - (inner[pipe - 1] === '\\' ? 1 : 0);
  const target = inner.slice(0, divider);
  const hash = target.indexOf('#');
  const path = hash < 0 ? target : target.slice(0, hash);
  const replacement = paths.get(path);
  return replacement ? `[[${replacement}${hash < 0 ? '' : target.slice(hash)}${inner.slice(divider)}]]` : link;
 });
}
