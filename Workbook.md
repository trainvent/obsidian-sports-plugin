# Adapting the Sports workbook

This guide lives in `Guide/Workbook.md` under the configured Sports notes folder
in your vault. Existing guide edits are preserved on template download and sync.

Give this guide and a copy of `templates/Training-example.xlsx` to your chatbot.
The example is a fixed starting point, not a personalized recommendation. Adapt
its goals, exercises, prescriptions, schedule and training volume to your needs.
Work on a copy. The plugin reads the workbook and never writes training results
back to it.

## Color key

| Color | Meaning | How to use it |
| --- | --- | --- |
| Pale green, alternating tones | Editable entry cells | Enter or adjust your training values. |
| White / light gray, alternating tones | Reference information and formulas | Read the plan and preserve formulas. |
| Neutral blue-gray | Headings | Keep the group labels and column names. |

Both editable and reference areas alternate row tones to help you follow a session
across the sheet. Colors are cues, not access restrictions.

In **Daily**, actual minutes, status, A/B/C entries, Core, Notes and the final three
manual result columns are green. Dates, plans, titles and planned minutes stay
neutral. In **Recurring**, start/end times, activity, recorded-by and notes are
green; the calculated Minutes column stays neutral. Strategy's `max_sets` and
`max_reps` cells and all headings stay neutral.

## Keep the workbook contract

- Save as `.xlsx`, under 5 MB. Do not add macros or external workbook links.
- Keep the tabs **Strategy**, **Recurring**, **Daily**. In Sports settings select
  **Strategy** as the strategy sheet and **Daily** as the tracking sheet.
  Select **Recurring** as the weekly schedule sheet. Each mapping accepts an exact
  tab name; leave a mapping blank to disable that import. Older workbooks with **Training log** remain supported.
- Keep section names alone in column A. Put their exact headers on the next row.
  A section name alone in column A begins the next table. Do not insert blank
  rows inside a Strategy table; they end that table.
- Do not put decorative titles, legends or commentary inside the data tables.
  Extra Daily columns must follow the supported names below.
- Keep identifiers unique and nonempty. Use simple IDs such as `pull-strength`.
  Preserve references when changing IDs in a new, unrecorded plan.
- Use real dates formatted `yyyy-mm-dd`, or explicit `YYYY-MM-DD` text. Use
  nonnegative numbers for minutes. Blank means unrecorded, not zero.
- Keep formulas and save calculated results. A chatbot that writes formulas must
  also calculate and save their cached values using a spreadsheet engine before
  handing the file back. The plugin reads saved values, not formula expressions.

## Strategy

Keep the following sections and headers:

| Section | Headers |
| --- | --- |
| Plan | `schema_version`, `plan_id`, `plan_name`, `timezone`, `start_date`, `max_sets`, `max_reps` |
| Goals | `goal_id`, `title`, `benchmark`, `baseline`, `test`, `category`, `result_column`, `garmin_types` |
| Parts | `part_id`, `version`, `title`, `prescription`, `goal_ids` |
| Week plans | `Week`, `Start`, `Phase`, `Focus`, `Targets`, `Advance when`, `Minutes`, `A`, `B` |
| Exercise arsenal | `Group`, `Exercise` |

**Plan:** exactly one row. Keep `schema_version` equal to `1`. Use a valid IANA
timezone, such as `Europe/Berlin`. Choose a stable `plan_id`; switching an imported
plan ID requires clearing the cached plan. `start_date` stays at **E3**. Set a
Monday before recording history. Plugin-created workbooks start next Monday in
the user's local calendar and use the user's local timezone.

The template defines `max_sets = 3` in **F3** for the three exercise groups
**A, B, C**, plus **Core** separately. `max_reps = 5` in **G3** describes the five
numbered rep fields beneath each exercise group. These metadata values describe
the template layout; changing them does not automatically add/remove columns or
rewrite prescriptions.

**Goals:** use `milestone` for skills to achieve or `maintenance` for abilities to
maintain. Baselines and results must reflect actual information; do not invent
measurements or achievements.

Each goal creates a note at `Goals/<goal_id>.md` under the configured Sports notes
folder. Keep the ID stable so reviews stay attached when renaming a goal. The
review area is outside the generated section and is preserved on every sync.

The optional `result_column` and `garmin_types` fields control two independent
sources. **Both sources work for every goal, regardless of its category.**

- `result_column`: the exact tracking-sheet column name, such as `HSPU result`.
  It must end with ` result`. Only nonempty entries in that column are copied to
  the goal note, with date, session status and shared session notes. Without an
  explicit mapping, the plugin matches the goal ID/title and the example's
  muscle-up, HSPU and pistol aliases when there is one unambiguous match.
- `garmin_types`: comma-separated stable Garmin activity type keys. `running`
  matches running, track/trail/indoor/treadmill running and supported run variants.
  `swimming` matches pool and open-water swimming. Other keys match exactly.
  Activity names such as German `Laufen` do not determine the match. Without an
  explicit mapping, goals named/identified as running or swimming are detected.
  Custom goals should use explicit type keys to avoid guessing from goal prose.
- A running aspiration can have `Running result` and `running`; a swimming
  maintenance goal can have `Swimming result` and `swimming`. Adding a manual
  mapping also requires adding that exact result column to Daily.
- The template includes swimming as a maintenance goal. Its starting routine is
  reported background, not a recorded performance or a change to Recurring.

**Parts:** `part_id` and `version` together identify a training block. Daily `Block`
values refer to these IDs. In `goal_ids`, separate goal IDs with commas, for example
`muscle-up, pistol`. Each must exist in Goals. A legacy `PartGoals` table with
`part_id`, `version`, `goal_id` is also supported.

**Week plans:** use unique positive week numbers and unique Monday Start dates.
Preserve the formulas linking Start to `$E$3`. `Minutes` is the manual training
budget; recurring tracker activities are separate. `A` and `B` contain the weekly
block prescriptions and feed Daily Plan formulas. Changing block names or adding
other block columns requires adapting the Daily formulas as well. The plugin
currently imports A and B as weekly prescriptions. Keep a full description in
Parts and Daily Plan for any other blocks.

**Exercise arsenal:** one exercise per row, unique across the arsenal. Repeat the
group on each row, or leave Group blank to inherit the preceding group. Start
with a nonempty group. **Never put a comma or colon in an exercise name.** These
characters separate items and prescriptions in the example's block text.
Use `High pull (chest-to-bar intent)`, not `High pull, chest-to-bar`.
Keep dosage outside the arsenal name: write `Pike push-up` here and
`Pike push-up: 3 x 5` in the weekly block. Commas are allowed between exercises
in block prescriptions, and are required as separators in `goal_ids`.
The arsenal is imported as reference information; it does not automatically
rewrite or validate the free-text prescriptions. Update matching text yourself.
The legacy `Exercises` table is not supported.

## Recurring

Keep `Weekly schedule` in A1 and these headers in row 2:

`Day`, `Time Start`, `Time End`, `Minutes`, `Activity`, `Recorded by`, `Notes`.

Use English weekday names. Additional rows can repeat the day or leave it blank
to inherit the preceding day. A blank Activity creates no event; blank spare rows
are allowed. Use native spreadsheet times formatted `hh:mm`, or `HH:mm` text.
With text times, replace the duration formula with a positive numeric duration.
The example's formula uses native times, leaves incomplete times blank, and
supports overnight activities. Equal start/end times produce zero and must be
corrected for an activity. Keep duration positive or blank; missing cached duration
can be derived from valid start/end times during import.

Recurring activities are planned events, not completed sessions. They appear in
the strategy note; enable **Show regular activities** for the dashboard and weekly
notes. Keep the weekly schedule in Recurring only. For legacy workbooks with a `Weekly schedule` section in Strategy, select
**Strategy** as the weekly schedule sheet as well. Only the selected schedule is imported.

## Daily

The template uses two header rows. Row 1 groups the exercise columns under
**A**, **B**, **C** and **Core**. Row 2 contains the regular column names and
subheadings. Keep these labels and their alignment intact.

| Columns | Row 2 headings | Use |
| --- | --- | --- |
| A–G | Date, Block, Plan, Title, Planned minutes, Actual minutes, Status | Session plan and recording |
| H–M | Done, 1, 2, 3, 4, 5 | A rep fields |
| N–S | Done, 1, 2, 3, 4, 5 | B rep fields |
| T–Y | Done, 1, 2, 3, 4, 5 | C rep fields |
| Z–AA | Done, Rounds | Core recording |
| AB | Notes | Shared session notes |
| AC–AE | Muscle-up result, HSPU result, Pistol result | Optional manual goal results |

**Plan:** the A and B session blocks stack each A), B), C) exercise and Core on
separate lines, just like Technique. The session's Block A/B and the exercise
groups A/B/C are separate labels. Keep tempo, rest, per-leg instructions and other
details in Plan; the rep entry cells contain no explanatory words.

**A/B/C:** the numbered fields are the rep fields. Counts use plain numbers such
as `2` or `5`; timed entries use native spreadsheet durations displayed as
`mm:ss`, such as `00:15` or `02:00`. When entering native times, use `0:00:15`
for fifteen seconds so the spreadsheet does not interpret it as fifteen minutes.
Unused fields stay blank. Prefilled values are targets, not completed training.
Adjust the values to what you did, then select TRUE in that group's Done field
to record them. A group left FALSE or blank does not import its prefilled values
as actual results. For a partial attempt, adjust the values first and use TRUE
to record that attempt; this does not complete the whole session.

**Core:** Rounds starts with the day's planned round count; Technique days without
a Core prescription leave it blank. Adjust it to the actual nonnegative whole
number of rounds (including zero), then select TRUE in Core Done to record it.
Unrecorded round targets are ignored during import.

**Manual goal results:** AC–AE start completely blank, with no formulas. Fill them
only when you want a result in the matching goal note. They do not automatically
summarize the A/B/C fields. Keep their exact headers while Strategy goal mappings
refer to them.

- One row represents one manual session. Keep Date and Plan formulas connected
  to the correct week and block. Copying a row requires checking every reference.
- Block must match a Parts `part_id`. Use `Part version` if that ID has multiple
  versions. Blank or `empty` Block means no linked strategy part.
- Status is one of `planned`, `in-progress`, `completed`, `skipped`, `cancelled`.
  Set `completed` explicitly only after doing the session. A Done flag records
  an exercise, not the whole session. The template's explicit `planned` Status
  remains planned until you change it. Without Status, actual results imply
  in-progress.
- Leave Actual minutes and manual goal results blank until recorded. Keep the
  prefilled rep and round targets separate from actual recorded training by
  leaving their Done flags FALSE or blank until recording.
- Without Session ID, the plugin uses Date plus Block as the session identity.
  For two sessions with the same date and block, add distinct stable Session IDs.

### Other supported daily layouts

Older flat layouts can put the headers on one row. Required names are `Date`,
`Block`, `Plan`. Other supported fields include `Title`, `Planned minutes`,
`Actual minutes`, `Status`, `Notes`, `Session ID`, `Part version` and `Sport`.
Custom result columns must end with ` result`; completion columns must end with
` done` and contain TRUE, FALSE or blank. FALSE and blank are distinct.

The grouped template is imported as `A done`, `A 1 result` through `A 5 result`
(and the equivalent B/C names), plus `Core done` and `Core rounds result`.
The grouped headers are the exception to the flat custom-column naming rule.
Do not add arbitrary columns such as `Reps` or `Weight`; use `Reps result` or
`Weight result` instead.

## Protect recorded history

Never shift the start date, change session identity, or rewrite completed training
when adapting future weeks. Preserve completed rows, dates, IDs, results and part
versions. If a part has completed history, preserve that part definition and add a
new version for future sessions. Keep the old version and select versions in Daily.
The plugin rejects changes to linked part definitions and dates it can recognize
as completed history, and retains missing completed sessions. Stable explicit
Session IDs make those checks more reliable.

Write reflections outside generated sections in Obsidian. Sync protects those
sections against accidental edits; change plans in the workbook instead.

## Checklist for a chatbot

1. Read this guide. Ask for the user's goals, availability and known baselines.
2. Adapt a copy of the example; preserve headers, sections, IDs and formulas.
3. Update goal links, arsenal names, weekly prescriptions and Daily consistently.
4. Preserve recorded history. Leave future actual minutes and manual results blank;
   prefilled rep/round targets must have FALSE or blank Done flags.
5. Recalculate and save the XLSX. Check for formula errors, broken references,
   duplicate IDs, unknown blocks/goals and commas or colons in arsenal names.
6. In Obsidian, select the file and sheet names, then **Sync now**. Confirm the
   imported dates, prescriptions and recurring durations before relying on them.
