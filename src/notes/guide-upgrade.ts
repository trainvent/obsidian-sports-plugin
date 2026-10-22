/** Update only exact obsolete stock wording; leave personalized guide content alone. */
export function upgradeWorkbookGuide(content: string): string {
 return content.replace(
  'The template uses two header rows. Row 1 groups the exercise columns under\n**A**, **B**, **C** and **Core**. Row 2 contains the regular column names and\nsubheadings. Keep these labels and their alignment intact.',
  'A/B/C/Core and five set fields are the example layout, not required names or limits.\nCustom exercise groups and set counts are supported. For one row per set, custom\nunits, variable targets, and multiple metrics, see [[Tracking|Flexible Daily tracking]].\nKeep structural headers and each group’s subcolumn alignment intact.',
 ).replace(
  'The template defines `max_sets = 3` in **F3** for the three exercise groups\n**A, B, C**, plus **Core** separately. `max_reps = 5` in **G3** describes the five\nnumbered rep fields beneath each exercise group. These metadata values describe\nthe template layout; changing them does not automatically add/remove columns or\nrewrite prescriptions.',
  'The template’s max_sets and max_reps metadata describe its example layout only.\nThey do not require particular exercise groups or impose set-count limits.\nChanging metadata does not automatically resize the workbook.',
 );
}
