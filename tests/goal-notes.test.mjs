import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const temp = mkdtempSync(`${tmpdir()}/sports-goal-tests-`);
process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
const output = await build({ stdin: { contents: "export { routineNoteTasks } from './src/notes/routines'; export { dailyLog } from './src/workbook/daily-log'; export { goalNoteTask } from './src/notes/goal-notes'; export { goalResultColumn, goalGarminTypes, matchesGarminType } from './src/notes/goal-sources'; export { goalNotePath } from './src/notes/goal-files';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
writeFileSync(`${temp}/goals.cjs`, output.outputFiles[0].text);
const { routineNoteTasks, dailyLog, goalNoteTask, goalResultColumn, goalGarminTypes, matchesGarminType, goalNotePath } = createRequire(import.meta.url)(`${temp}/goals.cjs`);
const session = { id: 's1', date: '2026-10-21', title: 'Training', status: 'in-progress', notes: 'Session context', results: { 'Running result': 'Felt easier today', 'HSPU result': '3 slow reps', 'Swimming result': 'Worked on breathing' } };
const plan = { parts: [], sessions: [session] };
const record = { id: '123', date: '2026-10-21', time: '09:00', name: 'Laufen', type: 'track_running', duration: 1800, distance: 5000, average_hr: 140 };
const cache = { activities: [record, { ...record, id: '124', type: 'walking', name: 'Walking named Laufen' }, { ...record, id: '125', type: 'lap_swimming', name: 'Schwimmen' }, { ...record, id: '126', type: 'open_water_swimming', name: 'Open water' }], lastSuccess: '2026-10-21T10:00:00Z', start: '2026-10-01', end: '2026-10-21', error: '' };

test('Notes topic routes reflections exclusively to the selected goal; General stays in the session', () => {
 const goals = [{id:'muscle-up',title:'Muscle-up'}, {id:'hspu',title:'Handstand push-up'}, {id:'pistol',title:'Pistol squat'}];
 for (const [i,topic] of ['Muscle-up','HSPU','Pistol'].entries()) {
  const notePlan = {parts:[],sessions:[{...session,results:{},notesTopic:topic,notes:'Focused reflection'},{...session,id:'general',results:{},notesTopic:'General',notes:'General reflection'}]};
  for (const [j,goal] of goals.entries()) {
   const body=goalNoteTask(goal,notePlan,undefined,'Sports').body;
   assert.equal(body.includes('Focused reflection'),i===j);
   assert.ok(!body.includes('General reflection'));
  }
 }
});

test('a running aspiration collects both matching XLSX entries and Garmin types, regardless of localized names', () => {
 const goal = { id: 'running', title: 'Running', category: 'milestone', benchmark: 'Faster 5 km' };
 const task = goalNoteTask(goal, plan, cache, 'Sports');
 assert.ok(task.body.includes('Felt easier today'));
 assert.ok(task.body.includes('[Laufen]'));
 assert.ok(!task.body.includes('Walking named Laufen'));
 assert.ok(!task.body.includes('Schwimmen'));
 assert.ok(!task.body.includes('3 slow reps'));
 assert.ok(task.initial.includes('## Review'));
 assert.ok(!task.body.includes('## Review'));
 const maintenance = goalNoteTask({ ...goal, category: 'maintenance' }, plan, cache, 'Sports');
 assert.ok(maintenance.body.includes('Felt easier today') && maintenance.body.includes('[Laufen]'));
});
test('a maintenance goal can collect both sources, with custom explicit mappings', () => {
 const goal = { id: 'swim-goal', title: 'Better technique', category: 'maintenance', benchmark: '', resultColumn: 'Swimming result', garminTypes: ['swimming'] };
 const task = goalNoteTask(goal, plan, cache, 'Sports');
 assert.ok(task.body.includes('Worked on breathing'));
 assert.ok(task.body.includes('Schwimmen') && task.body.includes('Open water'));
 assert.ok(!task.body.includes('Felt easier today'));
 assert.ok(!task.body.includes('[Laufen]'));
});
test('old skill columns resolve independently of category, while ambiguous matches need explicit mapping', () => {
 assert.equal(goalResultColumn({ id: 'hspu', title: 'Handstand push-up', category: 'maintenance' }, [session]), 'HSPU result');
 const sessions = [{ results: { 'Pistol result': 'A', 'Pistol squat result': 'B' } }];
 assert.equal(goalResultColumn({ id: 'pistol', title: 'Pistol squat' }, sessions), undefined);
 assert.equal(goalResultColumn({ id: 'pistol', title: 'Pistol squat', resultColumn: 'Pistol result' }, sessions), 'Pistol result');
 assert.deepEqual(goalGarminTypes({ id: 'running', title: 'Goal', garminTypes: ['cycling'] }), ['cycling']);
 assert.ok(matchesGarminType('trail_running', ['running']));
 assert.ok(!matchesGarminType('walking', ['running']));
});
test('goal paths stay stable on title changes and encode traversal and wikilink punctuation', () => {
 const goal = { id: '../unsafe|goal#', title: 'Original title' };
 const path = goalNotePath(goal);
 assert.ok(path.startsWith('Goals/'));
 assert.ok(!path.slice(6).includes('/') && !path.includes('../') && !path.includes('|') && !path.includes('#'));
 assert.equal(goalNotePath({ ...goal, title: 'Changed title' }), path);
});

const routineSession={id:'one',date:'2026-10-26',title:'Skill Am + Cal-Intervals',block:'A',prescription:'A) Pull-up: 3 x 3\nCal-Intervals: 5 rounds',status:'planned',notes:'Interval reflection',notesTopic:'Cal-Intervals'};
test('routine pages route selected notes exclusively and include matching sessions',()=>{
 const plan={sessions:[routineSession,{...routineSession,id:'two',notesTopic:'General',notes:'General reflection'}],weeklySchedule:[]};
 const tasks=routineNoteTasks(plan,'Sports');
 assert.deepEqual(tasks.map(task=>task.path),['Routines/_Index.md','Routines/Skills A.md','Routines/Skills B.md','Routines/Technique.md','Routines/Cal-Intervals.md','Routines/Swimming.md','Routines/Running.md']);
 for(const task of tasks){assert.equal(task.body.includes('Interval reflection'),task.path==='Routines/Cal-Intervals.md');assert.ok(!task.body.includes('General reflection'));}
 assert.ok(tasks.find(task=>task.path==='Routines/Skills A.md').body.includes('Skill Am + Cal-Intervals'));
});
test('all routine topics import without turning reflections into measurements',()=>{
 for(const topic of ['General','Cal-Intervals','Skills A','Skills B','Technique','Swimming','Running']){
  const sessions=dailyLog([['Date','Block','Plan','Notes','Notes topic'],['2026-10-26','','Training','Reflection',topic]],[],false);
  assert.equal(sessions[0].notesTopic,topic);assert.equal(sessions[0].notes,'Reflection');assert.equal(sessions[0].status,'planned');
 }
});
test('watch routines use activity type rather than guessing from names',()=>{
 const activity={id:'1',date:'2026-10-26',time:'10:00',type:'lap_swimming',name:'Pool session',duration:1200,distance:800};
 const cache={activities:[activity,{...activity,id:'2',type:'walking',name:'Running in name only'}]};
 const tasks=routineNoteTasks({sessions:[],weeklySchedule:[]},'Sports',cache);
 assert.ok(tasks.find(task=>task.path==='Routines/Swimming.md').body.includes('Pool session'));
 assert.ok(!tasks.find(task=>task.path==='Routines/Running.md').body.includes('Running in name only'));
});

test('routine explanations, goals, exercises and progression come from the workbook',()=>{
 const routinePlan={sessions:[routineSession],weeklySchedule:[],
  parts:[{id:'A',prescription:'Skills first; Am uses added mass.',goalIds:['muscle-up','pistol']},{id:'B',prescription:'Handstand strength.',goalIds:['hspu','pistol']},{id:'Technique',prescription:'Easy technique practice.',goalIds:['hspu']},{id:'Cal-Intervals',prescription:'Repeat the circuit.',goalIds:['muscle-up','hspu','pistol']}],
  goals:[{id:'muscle-up',title:'Muscle-up',benchmark:'First strict rep',test:'Controlled full movement'},{id:'hspu',title:'Handstand push-up',benchmark:'Full ROM',test:'Wall standard'},{id:'pistol',title:'Pistol squat',benchmark:'Clean single',test:'Heel down'}],
  weekPlans:[{week:1,start:'2026-10-26',phase:'Foundation',blocks:{A:'A) Scapular pull-up: 3 x 5, B) High pull: 3 x 3, C) Box pistol: 3 x 5/leg',B:'A) Pike push-up: 3 x 5'}}],
  intervals:[{exercise:'Pull-up',workSeconds:30,restSeconds:20}],
  exerciseArsenal:[{exercise:'Scapular pull-up',group:'Muscle-up'},{exercise:'High pull',group:'Muscle-up'},{exercise:'Box pistol',group:'Pistol squat'}]};
 const tasks=routineNoteTasks(routinePlan,'Sports');
 const a=tasks.find(task=>task.path==='Routines/Skills A.md').body;
 assert.ok(a.includes('Skills first; Am uses added mass.'));
 assert.ok(a.includes('First strict rep'));assert.ok(a.includes('Clean single'));assert.ok(!a.includes('Full ROM'));
 assert.ok(a.includes('Scapular pull-up'));assert.ok(a.includes('Weekly progression'));assert.ok(a.includes('Weeks/2026-10-26'));
 assert.ok(a.includes('### Muscle-up'));assert.ok(a.includes('### Pistol squat'));
 assert.ok(a.includes('| Scapular pull-up |'));assert.ok(!a.includes('- Scapular pull-up'));
 assert.ok(tasks.find(task=>task.path==='Routines/Skills B.md').body.includes('Full ROM'));
 assert.ok(tasks.find(task=>task.path==='Routines/Technique.md').body.includes('Easy technique practice.'));
 assert.ok(tasks.find(task=>task.path==='Routines/Cal-Intervals.md').body.includes('| Pull-up | 30 | 20 |'));
});
