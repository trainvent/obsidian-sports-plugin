/** Exact stock explanations retired from chart pages. User-authored prose is untouched. */
const replacements: [string,string][] = [
 ['Each source has its own line on the same time axis. Sheet minutes use explicitly recorded actual duration; smartwatch minutes sum recorded activity durations. Missing durations are omitted, so daily totals may be partial. The lines are not added: the same workout may appear in both sources. Zero smartwatch minutes means no activities were recorded within the imported range; dates outside that range stay unrecorded.', 'Sheet and watch totals are shown separately.'],
 ['Sheet intensity uses the left 0–10 axis. The right axis shows the daily median of available activity-average heart rates, in bpm. These are separate indicators in different units, not a shared intensity score or matched workouts. Missing values leave gaps.', ''],
 ['Performance is plotted as intensity × actual performance / 100 on the same scale as intensity: at 100% the lines coincide; at 80% the performance point is 20% below intensity. Values above 100% can plot above 10. This changes the display only, not the workbook score. Missing performance leaves a gap. At zero intensity the scaled value remains zero; raw percentages remain in the third chart.', '100% performance follows planned intensity.'],
 ['Felt effort uses the left 0–5 axis (recorded ratings are 1–5); planned intensity uses the right 0–10 axis. Intensity appears even before effort or performance is recorded. Missing values leave gaps, not zero points.', ''],
 ['Pace is duration ÷ distance, in minutes per kilometre. Faster pace is higher on the left axis; average heart rate uses the right axis in bpm.', ''],
 ['Swimming pace uses minutes per 100 m. Each point represents an activity at its recorded local date and time. Missing or nonpositive duration, distance, or heart rate leaves the corresponding series unrecorded; available measurements still appear. Heart rate describes cardiovascular intensity, not the workbook’s 0–10 rating. Pace reflects speed, not target attainment; terrain and workout type affect comparisons.', ''],
];
function compactProse(content: string): string {
 let result=content;
 for(const [oldText,newText]of replacements)result=result.replaceAll(oldText,newText);
 result=result.replace(/Performance scaling is calculated per session before taking the daily median\. Each other series uses the median of its available session values for the date\. Dates with incomplete session reporting can compare different subsets; check each session’s coverage and felt effort on \[\[[^\n]+?\]\]\. Edit intensity assumptions and planned volume in the workbook, record results and optional felt effort, save, then sync\./g,'');
 result=result.replace(/Open \[\[[^\n]+?\]\] for performance and effort, \[\[[^\n]+?\]\] for pace and sport-specific graphs, or \[\[[^\n]+?\]\] for the underlying sessions and activities\./g,'');
 result=result.replace(/Recorded minutes by sport, grouped into Monday-start weeks\. Only smartwatch activities are counted; workbook sessions are not added\.(?: \d+ activities lack duration and are excluded from minute totals, so coverage is partial\.)? First and last weeks may cover only part of a week\. Zero bars mean no recorded minutes in the imported interval\./g,'');
 result=result.replace(/Garmin imported \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}\./g,'');
 return result.replace(/\n{3,}/g,'\n\n').replace(/\n+(?=<!-- sports:end )/g,'\n');
}
export function compactAnalyticsCopy(content: string): string {
 return content.split(/(```[\s\S]*?```)/g).map((part,index)=>index%2 ? part : compactProse(part)).join('').trimEnd();
}
