/** Only activity summary measurements are retained, never routes or account responses. */
export interface GarminActivity {
 id: string; date: string; time: string; name: string; type: string;
 duration: number | null; distance: number | null; average_hr: number | null; hr_zones?: number[] | null;
}
export interface GarminCache {
 activities: GarminActivity[];
 zonesImported?: boolean;
 lastAttempt: string; lastSuccess: string; error: string;
 start: string; end: string;
}
export const EMPTY_GARMIN_CACHE: GarminCache = {
 activities: [], lastAttempt: '', lastSuccess: '', error: '', start: '', end: '',
};
