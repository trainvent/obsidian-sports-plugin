import type { Goal } from '../model/types';

/** IDs keep review files stable when goal titles change; encode path punctuation. */
export function goalNotePath(goal: Goal): string {
 const name = encodeURIComponent(goal.id).replace(/[.!'()*]/g, value => `%${value.charCodeAt(0).toString(16).toUpperCase()}`);
 return `Goals/${name}.md`;
}
export function goalNoteLink(goal: Goal, folder: string): string {
 const label = goal.title.replace(/[[\]|#\r\n]/g, ' ');
 return `[[${folder}/${goalNotePath(goal).slice(0, -3)}|${label}]]`;
}
