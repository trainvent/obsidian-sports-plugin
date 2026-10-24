# Adapting the Sports workbook

This guide lives in `Guide/Workbook.md` under the configured Sports notes folder
in your vault. Existing guide edits are preserved on template download and sync.

In **Settings → Sports**, open **Workbook guide → Open guide**, then choose a
starting point in XLSX or ODS:

| Option | Contents | Choose it when |
| --- | --- | --- |
| **Blank XLSX template** (`Training-Template.xlsx`) | All six example sheets, tables and formatting; training data and formulas cleared | You want to fill the full workbook yourself or with a chatbot |
| **Blank ODS template** (`Training-Template.ods`) | Basic Strategy, Recurring and Daily tables | You want the simpler ODS starting point |
| **Example workbook** (`Training-Example`) | A filled 12-week plan, library, loads, and scoring | You want to learn the format or adapt a working example |

Use this guide with either file. Adapt goals, exercises, schedule, equipment and
training volume before uploading and syncing. The example is not a personalized
recommendation. Sports reads the workbook and never writes results back to it.

## Fill the blank template

1. In **Strategy → Plan**, set a stable plan_id, your plan_name, timezone and
   Monday start_date. Keep schema_version at 1. Downloaded files use your local
   timezone and next Monday as the initial date.
2. Fill **Goals** and **Parts** as needed. Use part goal_ids to link them. Add
   **Week plans** if you want weekly phases and targets. Enter consecutive rows
   under each header; a blank row ends a Strategy table. Insert rows before the
   next section when more space is needed.
3. In **Daily**, enter a Date, readable Plan and Title for each session. Block
   may be blank or refer to a Parts ID. The XLSX template has no automatic dates,
   prescriptions or scores: enter values manually or add formulas suited to your
   own plan. Leave actual values blank until training, then record them and select
   Session done. Add stable Session IDs when multiple sessions share a date and
   block. See [Tracking.md](Tracking.md) for custom groups and set counts.
4. In **Recurring**, fill Activity to enable a weekly entry. Times are optional
   `HH:mm` text; enter positive Minutes or supply both start and end times.
   Blank activities remain inactive. Add rows to schedule more than one activity per day.
5. Save, upload, configure the three sheet mappings, then **Sync now**.

The XLSX template retains the full example layout, including A/B/C set columns,
Cal-Intervals, Library, Loads, Scoring, Plan summary and Plan recap. These labels
and calculation slots are structure, not prescribed exercises. Goals, workouts,
results, exercise definitions, equipment and added weights are empty. Plan metadata
and the layout's set-count and timed-work conversion defaults remain editable.

All cell formulas and their saved results are removed from the XLSX template,
including dates, Loads links, Scoring, summaries and recurring durations. Fill
these fields explicitly, or have your agent build calculations for your own
strategy. The calculation sections later in this guide describe the filled
example's method; they are optional reference material, not formulas included
in the template. Do not copy its fixed row references without adapting them.

Formatting is retained, so some neutral cells that previously held formulas are
now empty fields. The filled example keeps the working calculations for reference.
The ODS template is still the basic three-sheet version for now.

## Optional sections and sheets

The XLSX template includes every table but requires no calculations. Leave unused
optional tables empty or remove them as described below.

| Section or sheet | Optional when | How to omit it |
| --- | --- | --- |
| Goals and Parts | You do not need goals or linked training blocks | With Strategy import enabled, keep empty Goals and Parts labels/headers; leave Block blank for unlinked sessions |
| Week plans | You do not need weekly phases or targets | Leave empty or remove the section; enter Daily dates and plans directly |
| Plan summary and Plan recap | You do not want summaries or review prompts | Clear or remove these sections |
| Recurring | You have no weekly recurring activities | Leave Activity empty, or disable the weekly schedule sheet mapping before removing the sheet |
| Scoring | You do not need intensity/performance calculations or manual scores | Leave empty or remove the sheet |
| Library | You do not need exercise, equipment or interval references | Leave empty or remove it; keep equipment definitions if you use Loads |
| Loads | You do not track added weight | Leave empty or remove the sheet; enter Date and Session explicitly if using it |

If you or your agent add formulas later, check their dependencies before removing
referenced cells or sheets. Unused exercise groups and set columns may also be
removed. Retain the supported headers for the sections you keep.

### Fill it with a chatbot

Attach the workbook and this guide. For example:

```text
Use Workbook.md to fill the attached Training-Template workbook for my needs.
Ask for my goals, availability, experience, equipment and known starting levels
before planning. Preserve the supported sheet names, headers and stable IDs.
Do not invent completed workouts, measured baselines or results. Leave future
actual values blank. If you add formulas, recalculate and save their results.
Return an XLSX or ODS file and summarize the changes for me to review.
```

For an existing plan, also preserve all recorded history. Review the completed
file before syncing. A chatbot is optional; the same guide supports manual edits.

## Reading the filled example

**Am / Bm** are the A / B sessions with added mass (`m`). The underlying block
stays A or B; planned and actual added kg are recorded in **Loads**.

## Example workbook color key

| Color | Meaning | How to use it |
| --- | --- | --- |
| Pale green, alternating tones | Editable entry cells | Enter or adjust your training values. |
| White / light gray, alternating tones | Reference information and formulas | Read the plan and preserve formulas. |
| Neutral blue-gray | Headings | Keep structural column names; exercise group names are customizable. |

Both editable and reference areas alternate row tones to help you follow a session
across the sheet. Colors are cues, not access restrictions.

In **Daily**, actual minutes, Session done, A/B/C entries, Cal-Intervals, Notes,
Notes topic, and effort inputs are editable. Dates, plans, titles and planned minutes stay
neutral. In **Recurring**, start/end times, activity, recorded-by and notes are
green; the calculated Minutes column stays neutral. Strategy's `max_sets` and
`max_reps` cells and all headings stay neutral.

## Keep the workbook contract

- Save as `.xlsx` or `.ods`, under 5 MB. Do not add macros or external workbook links.
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
- Formulas are optional in the blank template. If you add formulas or adapt the
  filled example, calculate and save their cached results before returning the
  file. The plugin reads saved values, not formula expressions.

## Strategy

The XLSX template and filled example retain the following sections and headers.
Optional sections may be left empty or removed as described above. The ODS
template contains only the basic Plan, Goals, Parts and Week plans sections:

| Section | Headers |
| --- | --- |
| Plan | `schema_version`, `plan_id`, `plan_name`, `timezone`, `start_date`, `max_sets`, `max_reps` |
| Goals | `goal_id`, `title`, `benchmark`, `baseline`, `test`, `category`, `result_column`, `garmin_types` |
| Parts | `part_id`, `version`, `title`, `prescription`, `goal_ids` |
| Week plans | `Week`, `Start`, `Phase`, `Focus`, `Targets`, `Advance when`, `Minutes`, `A`, `B` |
| Plan summary | `Metric`, `Value` |
| Plan recap | `Prompt`, `Response` |

**Plan:** exactly one row. Keep `schema_version` equal to `1`. Use a valid IANA
timezone, such as `Europe/Berlin`. Choose a stable `plan_id`; switching an imported
plan ID requires clearing the cached plan. `start_date` stays at **E3**. Set a
Monday before recording history. Plugin-created workbooks start next Monday in
the user's local calendar and use the user's local timezone.

The example's `max_sets` and `max_reps` cells describe its example layout only.
They do not impose an exercise count, require A/B/C/Cal-Intervals, or limit set counts.
Changing these cells does not automatically resize the workbook.

**Goals:** use `milestone` for skills to achieve or `maintenance` for abilities to
maintain. Baselines and results must reflect actual information; do not invent
measurements or achievements.

Each goal creates a note at `Goals/<goal_id>.md` under the configured Sports notes
folder. Keep the ID stable so reviews stay attached when renaming a goal. The
review area is outside the generated section and is preserved on every sync.
Goal category, result-column mapping and Garmin types appear in note properties;
baseline, target and test standard stay in the body. These properties follow the
workbook on sync. Edit their values in Strategy; unrelated custom properties are preserved.

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
- The example includes swimming as a maintenance goal. Its starting routine is
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

Daily supports custom exercise groups and set counts. **A/B/C/Cal-Intervals and five
numbered fields are only the example layout**, not required names or limits.
For maximum flexibility, use one row per set/measurement with the headers
`Date`, `Session ID`, `Exercise`, `Set`, `Unit`, `Target`, `Result`, `Done`.
See [Flexible Daily tracking](Tracking.md) or **Guide/Tracking** in your vault for
examples, multiple metrics, variable set targets, and recording rules.

The existing example uses two header rows with A/B/C/Cal-Intervals exercise groups.
Rename, add, or remove these groups and their numbered set subcolumns as needed.
Keep structural headers and each group's subcolumn alignment intact.

| Columns | Row 2 headings | Use |
| --- | --- | --- |
| A–F | Date, Block, Plan, Title, Planned minutes, Actual minutes | Session plan and recording |
| G | Session done | One editable completion flag; TRUE marks the session completed |
| H–L | 1, 2, 3, 4, 5 | A rep/time fields |
| M–Q | 1, 2, 3, 4, 5 | B rep/time fields |
| R–V | 1, 2, 3, 4, 5 | C rep/time fields |
| W | Rounds | Cal-Intervals; 0 means not done |
| X | Notes | Reflection text |
| Y | Notes topic | General (default), goal or routine; routes the note to its Obsidian page |
| Z–AA | Planned intensity, Effort rating | Session ratings (XLSX); performance and coverage live in Scoring |

**Plan:** the A and B session blocks stack each A), B), C) exercise and Cal-Intervals on
separate lines, just like Technique. The session's Block A/B and the exercise
groups A/B/C are separate labels. Keep tempo, rest, per-leg instructions and other
details in Plan; the rep entry cells contain no explanatory words.

**Exercise groups (A/B/C in the example):** numbered fields record reps or time. Counts use plain numbers such
as `2` or `5`; timed entries use native spreadsheet durations displayed as
`mm:ss`, such as `00:15` or `02:00`. When entering native times, use `0:00:15`
for fifteen seconds so the spreadsheet does not interpret it as fifteen minutes.
Unused fields stay blank. In the blank template, you can leave future rep/time
fields empty and put targets in Plan, such as `A) Band squat: 3 x 10`. Enter
actual reps after training. Prefilled values are targets, not completed training.
Adjust the values to what you did, then select TRUE in **Session done** to record
them. FALSE or blank leaves the prefilled values unrecorded. For a partial
attempt, clear unused set values before selecting TRUE.

**Rounds groups (Cal-Intervals in the example):** Rounds starts with the day's planned round count; Technique days without
a Cal-Intervals prescription leave it blank. Adjust it to the actual nonnegative whole
number of rounds. With **Session done** TRUE, positive rounds are recorded;
**0 or blank means Cal-Intervals was not done**, so it stays unscored. There is
no separate circuit Done flag and no All done control. Session done is a manual
value, never a formula. TRUE marks the session completed; there is no separate
Status column in the XLSX. Notes topic replaces the three manual goal-result
columns. General notes stay with the session; selected Muscle-up, HSPU and Pistol
notes also appear on their goal page. Skills A, Skills B, Technique, Swimming and
Running route to **Routines/<topic>.md**. Routine goal links appear in the
**targets** note property. Cal-Intervals routes to
**Routines/Cal-Intervals.md**. Reflections do not count as measured performance.

**Goal reflections:** write in Notes and select its topic. General is the default;
only the selected goal receives the reflection. No note text is interpreted as
a measured result or automatic goal achievement.

- One row represents one manual session. In the blank template, enter Date and
  Plan directly. If your workbook uses formulas, check their references when
  copying rows or changing weeks and blocks.
- Block must match a Parts `part_id`. Use `Part version` if that ID has multiple
  versions. Blank or `empty` Block means no linked strategy part.
- The current template uses **Session done** to mark the session completed.
  Other layouts can use **Status**: `planned`, `in-progress`, `completed`,
  `skipped`, or `cancelled`. Exercise-specific Done flags record exercise results;
  they do not complete a session. Without an explicit completion field, actual
  results imply `in-progress`.
- Leave Actual minutes and Actual kg blank until recorded. Leave Session done
  FALSE or blank until the prefilled set values have been adjusted to actual results.
- Without Session ID, the plugin uses Date plus Block as the session identity.
  For two sessions with the same date and block, add distinct stable Session IDs.

### Other supported daily layouts

Older flat layouts can put the headers on one row. Required names are `Date`,
`Block`, `Plan`. Other supported fields include `Title`, `Planned minutes`,
`Actual minutes`, `Status`, `Notes`, `Session ID`, `Part version` and `Sport`.
Custom result columns must end with ` result`; completion columns must end with
` done` and contain TRUE, FALSE or blank. FALSE and blank are distinct.

A grouped heading is imported as `<group> done`, `<group> 1 result`,
`<group> 2 result`, etc., or `<group> rounds result`. Names and counts are custom.
The grouped headers are the exception to the flat custom-column naming rule.
Do not add arbitrary columns such as `Reps` or `Weight`; use `Reps result` or
`Weight result` instead.

## Properties and tags

Overview provides general navigation. Generated notes do not repeat navigation
bars. Keep links where they describe a relationship: goal links in routine
properties, a weekly-note link on each day, and dated links in logs and plans.

| Note | Managed properties | Source |
| --- | --- | --- |
| `Goals/<goal_id>.md` | `goal_id`, `category`, `result_column`, `garmin_types` | Goals table and resolved source mappings |
| `Routines/<name>.md` | `targets` (list of goal links) | Part/goal relationships; running and swimming goal mappings |
| `Days/YYYY-MM-DD.md` | `date`, `week` (weekly-note link) | Entry date and its Monday-start week |
| `Weeks/YYYY-MM-DD.md` | `week_start`, `week_end`, `program_week`, `phase` | Calendar dates and matching Week plans row |

Goal categories appear as **Aspiration** or **Maintenance**. Baseline, target, and
test standard remain in the goal body. Empty optional properties are omitted;
for example, a week without a Week plans row has no program_week or phase.

A routine's properties can look like this:

```yaml
---
targets:
  - "[[Sports/Goals/muscle-up|Muscle-up]]"
  - "[[Sports/Goals/pistol|Pistol squat]]"
tags:
  - sports/planning
  - sports/goals
---
```

Sports uses your configured notes folder in the links. Sync updates the managed
properties from imported data. Change goal mappings and plan metadata in the
workbook; changes to those properties in Obsidian are not written back.
Unrelated custom properties are preserved.

| Shared tag | Pages |
| --- | --- |
| `sports` | Overview |
| `sports/planning` | Plans, Strategy, Calendar, routine index, routines, weeks |
| `sports/goals` | Plans, goals, routines |
| `sports/training` | Log, day index, days, weeks |
| `sports/analytics` | Stats, Sheet, Smartwatch |
| `sports/guide` | Tracking guide |
| `sports/running`, `sports/swimming` | Matching routines and goals with those resolved Garmin types |

Use Obsidian's tag pane or search a tag such as `tag:#sports/planning` to find
related notes. Sports refreshes these tag groups on sync, removing stale managed
tags and keeping your custom tags. Use your own tag names for personal grouping.

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

## Weeks and routines base

`Sports.base` provides **Weeks** and **Routines** table views using the properties
above. Open **Browse weeks and routines** from Overview with the **Bases** core
plugin enabled. Weeks show start/end dates, program week and phase; routines show
their linked goals. Filters stay within the configured notes folder and exclude
backups and the routine index.

Sports creates a default base only when the file is missing. Your changes to
columns, sorting and filters are preserved. It reads note properties directly;
there is no second training database. Editing imported properties in the base
has the same effect as editing them on a note: sync restores the workbook values.

## Sync recovery

Keep the `sports:begin` and `sports:end` comments around generated sections.
They are hidden in Reading view. Write personal reflections outside them.

1. For a refresh without downloading, run **Generate notes from imported data**.
   For deleted notes, use **Recreate missing notes** instead.
2. If a generated section conflicts, move any personal additions outside it and
   restore the original generated section, including its markers, before refreshing.
3. For persistent sync-state errors, use **Clear cached data**, then **Sync now**.
   This keeps note files and settings, clears imported data and baselines, and
   backs up each existing target note before rebuilding its generated section.

The reset records pending notes before clearing the caches. Recovery continues
when later imports bring back Garmin-only dates and historical weeks; a successful
workbook refresh does not end recovery for those notes. Successfully recovered
notes regain normal edit protection. Malformed or duplicate markers still stop
a note from being rewritten; repair them from a known good copy first.

Backups live under `Backups/<timestamp>/` in the configured notes folder. They
preserve the full pre-rebuild note, including any edits inside generated sections.
Reflections outside the markers and unrelated custom properties stay in the active
note. Normal sync does not create backups, and the plugin does not read them as
training data. You can remove old backups after checking the recovered notes.

A reset clears cached history too. Keep completed results in the workbook and
retain any notes or backups containing information absent from the source.
Deleting the Sports folder is not required for recovery.

## Checklist for a chatbot

1. Read this guide. Ask for the user's goals, availability and known baselines.
2. Adapt a copy of the example; preserve headers, sections, IDs and formulas.
3. Update goal links, arsenal names, weekly prescriptions and Daily consistently.
4. Preserve recorded history. Leave future actual minutes and manual results blank;
   prefilled rep/round targets must have Session done FALSE or blank.
5. Recalculate and save the workbook. Check for formula errors, broken references,
   duplicate IDs, unknown blocks/goals and commas or colons in arsenal names.
6. In Obsidian, select the file and sheet names, then **Sync now**. Confirm the
   imported dates, prescriptions and recurring durations before relying on them.


## Scoring and the Analytics folder

The example includes a **Scoring** formula sheet. Keep the plugin's three import
mappings on Strategy, Daily, and Recurring. The XLSX example uses one Scoring
table for exercise targets, results, intensity and performance. Scoring is read
automatically alongside Daily; keep its tab name.

Result links to explicit Done and result fields in Daily. Exercise performance
is result / target × 100. The first row of each session contains its planned
intensity, median Performance, Scored metrics and Planned metrics. Coverage
makes partial results visible. Cal-Intervals occupies one row per session, scoring
completed rounds and using its shared Library definition for intensity.

The example calculates **Planned intensity** from exercise assumptions and planned
volume, rounded to one decimal on a **0–10** scale (0 means no planned demand,
10 means highest planned demand). Optionally enter **Effort rating** (1–5)
afterward to record how hard it felt, or leave it blank. Neither rating affects
the performance calculation. No duration × RPE score is required or inferred.
When extending the workout layout, update Scoring's actual-cell references,
explicit targets, and the Daily median/count ranges for that session.
Recalculate and save the workbook before syncing.

### Exercise library and added load

**Library** holds the reference data. Keep this tab name: it is imported
automatically alongside Strategy or Daily.

Preserve section labels and header rows; write entries underneath them. In the
unchanged XLSX layout, Equipment is the section label at **A60**, headers are
**A61:D61**, and the first equipment entry belongs in **A62:D62**.
For resistance bands, leave Min kg and Max kg blank unless you have a meaningful
measured range. Describe the band/resistance in Notes and name it in the workout
prescription. Loads is for added kilograms; bands do not require a Loads entry.
Base intensity and Growth per kg may stay blank when you are not using scoring.

| Table | Headers |
| --- | --- |
| Exercise arsenal | `Group`, `Exercise`, `Base intensity (0–10)`, `Unit`, `Growth per kg` |
| Equipment | `Equipment`, `Min kg`, `Max kg`, `Notes` |

The XLSX arsenal occupies **Library!A2:E58**. Base intensity is in **C**, units in
**D**, and growth per kg in **E**. Growth is an editable relative multiplier:
4% means each added kg increases the exercise rating by 4% of its base rating.
The seeded rates are planning estimates, not measured physiological effects.
Pulling and muscle-up exercises start at 4%/kg; upright band transition drills
and pistol variations at 3%/kg; push-ups, squats and dips at 2%/kg.
Pike push-ups, handstands/HSPU, low-bar drills, inverted work and mobility
leave this field blank. A blank rate leaves the base intensity unchanged.
Rates do not prescribe vest use: only entries in Loads add planned weight.
Weighted and unweighted work share the same exercise entry; there are no separate
vest variants. The Cal-Intervals definition supplies its own work seconds.

**Loads** is a sparse table, not a second full training log. Add a row only for
an exercise with added weight; Daily gains no extra columns. Keep its tab name.

| Table | Headers |
| --- | --- |
| Added load | `Date`, `Session`, `Exercise`, `Equipment`, `Planned kg`, `Actual kg`, `Notes` |

Date and Session must identify one Daily session; Exercise must match its
prescription or a Cal-Intervals exercise in Library. Only one load row per exercise per
session is supported. Copy a row and edit it to add another weighted exercise.
The lookup ranges cover rows 3–1000. To increase that capacity, extend the
ranges in Scoring too.

The example equipment includes a **6–10 kg weight vest**. Three sessions pair **3 × 3
vest pull-ups** and **3 × 5 vest dips** at 6 kg, then remove the vest before the
unweighted Cal-Intervals circuit. Adapt the equipment and loads to your training.
Set planned kg to 0 or remove the load row for bodyweight. Leave actual kg blank
until recorded; **Session done does not invent an actual weight**. Actual 0 means
bodyweight. A Done flag is still required before a load appears as a recorded
result in the exercise comparison.

### Load-adjusted intensity formula

```text
loaded_intensity_i = MIN(10, base_intensity_i × (1 + planned_kg_i × growth_per_kg_i))
planned_amount_i = sets_i × reps_or_seconds_per_set_i
volume_weight_i = planned_amount_i                 for reps
volume_weight_i = 2 × planned_amount_i             for reps per leg
volume_weight_i = planned_amount_i / seconds_per_rep for timed work
session_intensity = ROUND(SUM(loaded_intensity_i × volume_weight_i)
                          / SUM(volume_weight_i), 1)
```

For example, a base rating of 5 at 2%/kg becomes **5.6 at 6 kg**. With no load row,
planned kg is 0 and the base rating is unchanged. Ratings are capped at 10 before
averaging. More sets changes volume weighting, rather than summing ratings.

The **Assumptions** table below the Scoring calculations holds the editable
timed-work conversion: **Scoring!B177**, initially 3 seconds per rep equivalent.
In the unified XLSX table, **C:F** holds exercise, unit, sets and amount per set;
**G:I** holds target, result and exercise performance; **J:M** holds base intensity,
planned kg, growth and loaded intensity. **N:O** holds volume and contribution.
**P:S** contains the session summary on its first row. For example:

```excel
=MIN(10,J5*(1+K5*L5))
```

**Scoring!P5** combines its session rows; **Daily!Z3** links to that result:

```excel
=IF(COUNT(O5:O8)<>COUNT(N5:N8),"",IF(SUM(N5:N8)=0,0,ROUND(SUM(O5:O8)/SUM(N5:N8),1)))
```

Changing plan prose does not rewrite Scoring’s sets or amounts. Update them and
the performance targets together. **Library!A65:F70** defines Cal-Intervals once:
four exercises, each with editable work and rest seconds. The initial timing is
30 seconds work + 20 seconds rest. The single Scoring row multiplies per-round
volume and contribution by its planned rounds; rest is excluded from intensity.
Missing or duplicate exercise matches and invalid inputs
leave intensity unavailable. Rep/time performance and felt effort remain
separate; added kg is shown as its own comparison metric, not added to reps.

### End-of-plan recap

At the bottom of Strategy, **Plan summary** shows planned/completed sessions,
recorded manual minutes, and median recorded performance. **Plan recap** has six
short response fields for goal progress, what worked, changes, recovery, load
observations, and the next plan. Completion uses **Session done** in the provided files, or explicit **Status** in other
layouts. Tracker imports and exercise-specific Done flags do not complete a session.

The plugin creates **Analytics/Sheet.md** and **Analytics/Smartwatch.md** for source
charts, and **Stats.md** for source totals and intensity/heart-rate timelines.
`Days/_Index.md` is the date index; `Days/YYYY-MM-DD.md` holds that day's
sheet sessions, scores, sets, and Garmin activities. Log dates link to these
notes. Existing day-index reflections remain on the index, and each day has its
own preserved reflections section.
Sheet shows three time-series charts, all with dates on the horizontal axis:

1. Performance × intensity and planned intensity on one shared scale.
   Displayed performance = session intensity × actual performance / 100. At
   100% the lines coincide; at 80% the performance point is 20% lower. Values
   above 100% can extend above 10; the display expands without clipping.
2. Felt effort (left 0–5 axis, recorded ratings 1–5) and intensity (right 0–10).
3. Actual daily performance only, on a fixed 0–200% scale: 0% at the bottom,
   100% in the center, and 200% at the top. There is no expected-performance
   series. Values above 200% are marked at the top with actual values in point
   labels. With no results, the axes remain visible without data points.

Performance is scaled per session before taking the daily median. Other series
use the median of available session values per date. Intensity
is visible before performance or effort is recorded. Missing values leave gaps;
they are not plotted as zero. Session coverage and felt-effort ratings remain in Log and dated day notes.
The separate axes compare trends across different units, not equal values.
A score measures target attainment, not absolute training quality. Keep
commentary outside protected generated sections.


## ODS imports

ODS uses the same sheet mappings and training layouts as XLSX. In LibreOffice
Calc, save a copy as `.ods`, recalculate and save, then update the plugin’s cloud
workbook link. Sports imports saved cell values, including formula results; it
does not evaluate formulas. Verify calculated intensity and Done values after
conversion. Choose **Download XLSX** or **Download ODS** in settings. Both start next Monday.
Both starting points use a manual TRUE/FALSE **Session done** dropdown. In the
filled example, Notes topics, Loads, Library, Scoring and Cal-Intervals use the
same structure in both formats. The XLSX template keeps the full layout with all cell formulas removed; the ODS
template remains the basic three-sheet version.
