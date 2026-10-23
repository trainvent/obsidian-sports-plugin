export const NOTE_RENAMES = [
 ['_Index.md', 'Overview.md', 'analytics'],
 ['Analytics/Index.md', 'Overview.md', 'analytics'],
 ['Analytics/_Index.md', 'Overview.md', 'analytics'],
 ['Analytics/Daily/Index.md', 'Days/_Index.md', 'analytics-daily'],
 ['Analytics/Daily/_Index.md', 'Days/_Index.md', 'analytics-daily'],
 ['Analytics/Combined.md', 'Stats.md', 'analytics-combined'],
 ['Plans.md', 'Structure/Plans.md', 'plan'],
 ['Calendar.md', 'Structure/Calendar.md', 'calendar'],
 ['Strategy.md', 'Structure/Strategy.md', 'strategy'],
 ['Log.md', 'Analytics/Log.md', 'training-log'],
 ['Routines/Index.md', 'Routines/_Index.md', 'routines-index'],
 ['Routines/Intervals.md', 'Routines/Cal-Intervals.md', 'routine:intervals'],
 ['Plan.md', 'Structure/Plans.md', 'plan'],
 ['complete-log.md', 'Analytics/Log.md', 'training-log'],
 ['Training log.md', 'Analytics/Log.md', 'training-log'],
 ['Analytics.md', 'Overview.md', 'analytics'],
 ['Analytics/Daily.md', 'Days/_Index.md', 'analytics-daily'],
 ['Analytics/Graph.md', 'Analytics/Sheet.md', 'analytics-graph'],
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
  const replacement = paths.get(path) ?? (path.startsWith(`${folder}/Analytics/Daily/`) ? path.replace(`${folder}/Analytics/Daily/`, `${folder}/Days/`) : undefined);
  return replacement ? `[[${replacement}${hash < 0 ? '' : target.slice(hash)}${inner.slice(divider)}]]` : link;
 });
}
