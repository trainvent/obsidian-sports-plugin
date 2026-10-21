import type { Goal, Session } from '../model/types';

const normalized = (value: string): string => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const ALIASES: Record<string, string[]> = {
 muscleup: ['Muscle-up result'], hspu: ['HSPU result'], handstandpushup: ['HSPU result'], pistol: ['Pistol result'], pistolsquat: ['Pistol result'],
};

/** Match exact IDs/titles and the original template aliases; never guess from prose. */
export function goalResultColumn(goal: Goal, sessions: Session[]): string | undefined {
 if (goal.resultColumn) return goal.resultColumn;
 const headers = [...new Set(sessions.flatMap(session => Object.keys(session.results ?? {})))];
 const names = [normalized(goal.id), normalized(goal.title)];
 const aliases = names.flatMap(name => ALIASES[name] ?? []);
 const matches = headers.filter(header => aliases.includes(header) || names.includes(normalized(header.replace(/ result$/, ''))));
 return matches.length === 1 ? matches[0] : undefined;
}

/** These are stable Garmin type keys, independent of activity names or goal category. */
export function goalGarminTypes(goal: Goal): string[] {
 if (goal.garminTypes !== undefined) return goal.garminTypes;
 const names = [normalized(goal.id), normalized(goal.title)];
 if (names.some(name => ['running', 'run', 'laufen'].includes(name))) return ['running'];
 if (names.some(name => ['swimming', 'swim', 'schwimmen'].includes(name))) return ['swimming'];
 return [];
}
export function matchesGarminType(type: string, types: string[]): boolean {
 return types.some(key => key === type || (key === 'running' && (type.endsWith('_running') || ['virtual_run', 'ultra_run', 'obstacle_run'].includes(type))) || (key === 'swimming' && type.endsWith('_swimming')));
}
