import type { SessionScores } from '../workbook/score-fields';
import type { ExerciseTracking } from './exercise-tracking';
import type { CoachCache } from '../garmin/coach';
import type { GarminCache } from '../garmin/types';
export type GoalCategory = 'milestone' | 'maintenance';
export interface Goal { id: string; title: string; benchmark: string; baseline?: string; test?: string; category?: GoalCategory; resultColumn?: string; garminTypes?: string[] }
export interface TrainingPart { id: string; version: string; title: string; prescription: string; goalIds: string[] }
export interface Session {
 id: string; date: string; sport: string; title: string;
 partId: string; partVersion: string; plannedMinutes: number | null;
 tracking?: ExerciseTracking[]; scores?: SessionScores;
 block?: string; prescription?: string; checks?: Record<string, boolean | null>; results?: Record<string, string>;
 actualMinutes: number | null; result: string; status: string; notes: string;
}
export interface WeeklyScheduleItem { id: string; weekday: number; time: string; minutes: number | null; title: string; recordedBy: string; notes: string }
export interface WeekPlan { week: number; start: string; phase: string; focus: string; targets: string; advanceWhen: string; minutes: number | null; blocks?: Record<string, string> }
export interface TrainingPlan {
 id: string; name: string; timezone: string; goals: Goal[];
 exerciseArsenal?: { group: string; exercise: string }[];
 weeklySchedule?: WeeklyScheduleItem[];
 weekPlans?: WeekPlan[];
 parts: TrainingPart[]; sessions: Session[]; importedAt: string;
}
export interface SportsData {
 showGarminCoachPlans: boolean; garminCoachCache?: CoachCache;
 garminEnabled: boolean; garminSecretId: string; garminHistoryStart: string; garminCache?: GarminCache;
 workbookPath: string; strategySheet: string; trackingSheet: string; scheduleSheet: string; notesFolder: string; syncMinutes: number;
 showRegularActivities: boolean; syncOnStartup: boolean; plan: TrainingPlan | null;
 resetNoteBaselines: boolean; generatedBlocks: Record<string, string>; lastError: string;
}
export const DEFAULT_DATA: SportsData = {
 showGarminCoachPlans: false,
 garminEnabled: false, garminSecretId: '', garminHistoryStart: '',
 workbookPath: '', strategySheet: 'Strategy', trackingSheet: 'Daily', scheduleSheet: 'Recurring', notesFolder: 'Sports', syncMinutes: 10, syncOnStartup: true, showRegularActivities: false,
 plan: null, resetNoteBaselines: false, generatedBlocks: {}, lastError: '',
};
