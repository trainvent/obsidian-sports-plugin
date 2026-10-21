/** Use Obsidian's inline filename title; leave frontmatter and custom headings intact. */
export function withoutNoteTitle(content: string, expected?: string): string {
 const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)?.[0] ?? '';
 const rest = content.slice(frontmatter.length);
 const heading = rest.match(/^# ([^\r\n]+)\r?\n/);
 if (!heading || (expected !== undefined && heading[1] !== expected)) return content;
 return frontmatter + rest.slice(heading[0].length).replace(/^\r?\n/, '');
}

export function initialNoteTitle(initial: string): string | undefined {
 return initial.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').match(/^# ([^\r\n]+)\r?\n/)?.[1];
}
