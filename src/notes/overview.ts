import type { TrainingPlan } from '../model/types';
import type { GarminCache } from '../garmin/types';
import { weekDates } from '../model/calendar';
import { noteLink } from './plan';

export function overviewMarkdown(plan: TrainingPlan | null, folder: string, cache?: GarminCache, now=new Date()): string {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:plan?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const week=weekDates(new Date(`${today}T12:00:00`))[0]!;
 const hasDay=(plan?.sessions??[]).some(session=>session.date===today)||(cache?.activities??[]).some(activity=>activity.date===today);
 const completed=(plan?.sessions??[]).filter(session=>session.status==='completed').length;
 const recorded=(cache?.activities??[]).length;
 const links=[['Sports.base','Browse weeks and routines','Sortable weeks and routine goals'],['Stats','Stats','Training trends and comparisons'],['Routines/_Index','Routines','Exercises, targets and routine notes'],['Days/_Index','Days','Sheet sessions and watch activity by day'],['Structure/Plans','Plans','Goals and weekly progression'],['Structure/Calendar','Calendar','Training schedule'],['Structure/Strategy','Strategy','Program structure and exercise library'],['Analytics/Log','Log','Detailed training records']];
 return `> [!summary] Training stats\n> ${noteLink(folder,'Stats','Open Stats')} · ${noteLink(folder,'Analytics/Sheet','Sheet')} · ${noteLink(folder,'Analytics/Smartwatch','Smartwatch')}\n\n| Today | This week |\n| --- | --- |\n| ${noteLink(folder,hasDay?`Days/${today}`:'Days/_Index',today).replace('|','\\|')} | ${noteLink(folder,`Weeks/${week}`,'Open week').replace('|','\\|')} |\n\n| Completed sessions | Watch activities |\n| ---: | ---: |\n| ${completed} | ${recorded} |\n\n## Explore\n\n| Page | |\n| --- | --- |\n${links.map(([path,label,description])=>`| ${noteLink(folder,path!,label!).replace('|','\\|')} | ${description} |`).join('\n')}`;
}
