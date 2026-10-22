/** A later successful refresh can resolve an earlier note warning, not a failed import. */
export function reconcileNoteWarning(previous: string, issues: string[]): string {
 if (previous && !previous.startsWith('Workbook imported; ') && !previous.startsWith('Generated notes: ')) return previous;
 return issues.length ? `Generated notes: ${issues.length} note(s) need attention: ${issues[0]}` : '';
}
