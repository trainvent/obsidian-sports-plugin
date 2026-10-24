import type { Session, TrainingPlan } from '../model/types';
import type { GarminCache } from '../garmin/types';
import { activityDetails } from '../garmin/activities';
import { matchesGarminType } from './goal-sources';
import { noteLink } from './plan';
import { routineStrategyMarkdown } from './routine-strategy';

const routines = ['Skills A', 'Skills B', 'Technique', 'Cal-Intervals', 'Swimming', 'Running'] as const;
const cell = (value: string): string => value.replaceAll('|', '&#124;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\r\n]+/g, '<br>');
function topic(session: Session): string {
 return session.notesTopic ?? 'General';
}
function includesSession(name: string, session: Session): boolean {
 if (topic(session) === name) return true;
 if (name === 'Skills A') return session.block === 'A';
 if (name === 'Skills B') return session.block === 'B';
 if (name === 'Technique') return session.block?.toLowerCase() === 'technique';
 if (name === 'Cal-Intervals') return /Cal-Intervals:\s*\d+\s*rounds/i.test(session.prescription ?? '');
 return false;
}
export function routineNoteTasks(plan: TrainingPlan, folder: string, cache?: GarminCache): {path: string; id: string; body: string; initial: string}[] {
 const links = routines.map(name => noteLink(folder, `Routines/${name}`, name));
 const tasks = routines.map(name => {
  const sessions = plan.sessions.filter(session => includesSession(name, session)).sort((a,b) => b.date.localeCompare(a.date));
  const reflections = sessions.filter(session => topic(session) === name && session.notes.trim()).map(session => `| ${session.date} | ${cell(session.title)} | ${cell(session.notes)} |`).join('\n');
  const workouts = sessions.map(session => `| ${session.date} | ${cell(session.title)} | ${cell(session.status)} |`).join('\n');
  const types = name === 'Swimming' ? ['swimming'] : name === 'Running' ? ['running'] : [];
  const activities = (cache?.activities ?? []).filter(activity => matchesGarminType(activity.type, types)).sort((a,b) => b.date.localeCompare(a.date));
  const garmin = activities.map(activity => `| ${activity.date} | ${cell(activity.name)} | ${cell(activityDetails(activity))} |`).join('\n');
  const schedule = (plan.weeklySchedule ?? []).filter(item => name === 'Swimming' ? /swim/i.test(item.title) : name === 'Running' ? /run/i.test(item.title) : false).map(item => `- ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][item.weekday]} ${item.time} · ${cell(item.title)}`).join('\n');
  return {path:`Routines/${name}.md`, id:name === 'Cal-Intervals' ? 'routine:intervals' : `routine:${name.toLowerCase().replaceAll(' ','-')}`,
   body:`${routineStrategyMarkdown(name, plan, folder, sessions)}## Workbook notes\n\n${reflections ? `| Date | Session | Note |\n| --- | --- | --- |\n${reflections}` : 'No notes for this routine yet.'}\n\n${schedule ? `## Regular schedule\n\n${schedule}\n\n` : ''}## Sessions\n\n${workouts ? `| Date | Session | Status |\n| --- | --- | --- |\n${workouts}` : 'No workbook sessions.'}${types.length ? `\n\n## Watch activities\n\n${garmin ? `| Date | Activity | Measurements |\n| --- | --- | --- |\n${garmin}` : 'No matching watch activities.'}` : ''}`,
   initial:`# ${name}\n\n## Reflections\n- \n`};
 });
 return [{path:'Routines/_Index.md',id:'routines-index',body:`${links.map(link=>`- ${link}`).join('\n')}`,initial:'# Routines\n'},...tasks];
}
