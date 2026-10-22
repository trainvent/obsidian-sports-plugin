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
| Neutral blue-gray | Headings | Keep structural column names; exercise group names are customizable. |

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

The template's `max_sets` and `max_reps` cells describe its example layout only.
They do not impose an exercise count, require A/B/C/Core, or limit set counts.
Changing these cells does not automatically resize the workbook.

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

Daily supports custom exercise groups and set counts. **A/B/C/Core and five
numbered fields are only the example layout**, not required names or limits.
For maximum flexibility, use one row per set/measurement with the headers
`Date`, `Session ID`, `Exercise`, `Set`, `Unit`, `Target`, `Result`, `Done`.
See [Flexible Daily tracking](Tracking.md) or **Guide/Tracking** in your vault for
examples, multiple metrics, variable set targets, and recording rules.

The existing example uses two header rows with A/B/C/Core exercise groups.
Rename, add, or remove these groups and their numbered set subcolumns as needed.
Keep structural headers and each group's subcolumn alignment intact.

| Columns | Row 2 headings | Use |
| --- | --- | --- |
| A–G | Date, Block, Plan, Title, Planned minutes, Actual minutes, Status | Session plan and recording |
| H–M | Done, 1, 2, 3, 4, 5 | A rep fields |
| N–S | Done, 1, 2, 3, 4, 5 | B rep fields |
| T–Y | Done, 1, 2, 3, 4, 5 | C rep fields |
| Z–AA | Done, Rounds | Core recording |
| AB | All done | Record every exercise group in the row at once |
| AC | Notes | Shared session notes |
| AD–AF | Muscle-up result, HSPU result, Pistol result | Optional manual goal results |
| AG–AL | Planned intensity, Effort rating, Expected performance, Actual performance, Scored metrics, Planned metrics | Separate ratings, performance formulas, and coverage |

**Plan:** the A and B session blocks stack each A), B), C) exercise and Core on
separate lines, just like Technique. The session's Block A/B and the exercise
groups A/B/C are separate labels. Keep tempo, rest, per-leg instructions and other
details in Plan; the rep entry cells contain no explanatory words.

**Exercise groups (A/B/C in the example):** numbered fields record reps or time. Counts use plain numbers such
as `2` or `5`; timed entries use native spreadsheet durations displayed as
`mm:ss`, such as `00:15` or `02:00`. When entering native times, use `0:00:15`
for fifteen seconds so the spreadsheet does not interpret it as fifteen minutes.
Unused fields stay blank. Prefilled values are targets, not completed training.
Adjust the values to what you did, then select TRUE in that group's Done field
to record them. A group left FALSE or blank does not import its prefilled values
as actual results. For a partial attempt, adjust the values first and use TRUE
to record that attempt; this does not complete the whole session.

**Rounds groups (Core in the example):** Rounds starts with the day's planned round count; Technique days without
a Core prescription leave it blank. Adjust it to the actual nonnegative whole
number of rounds (including zero), then select TRUE in Core Done to record it.
Unrecorded round targets are ignored during import.

**All done:** select TRUE in **AB**, immediately after Core, to record all exercise
groups at once. First adjust the numbered results and Core rounds to what you
actually did. The master control overrides individual Done fields during import
and performance calculation and highlights those fields; their stored values
stay available for individual recording. Select FALSE or clear All done to return
to the individual controls. Missing results stay blank. This does not change
Status or fill manual goal results. All example rows start with All done FALSE.

**Manual goal results:** AD–AF start completely blank, with no formulas. Fill them
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

A grouped heading is imported as `<group> done`, `<group> 1 result`,
`<group> 2 result`, etc., or `<group> rounds result`. Names and counts are custom.
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


## Scoring and the Analytics folder

The example includes a **Scoring** formula sheet. Keep the plugin's three import
mappings on Strategy, Daily, and Recurring; Scoring feeds formulas on Daily and
is not a fourth import selection.

Scoring has Date, Session, Exercise, Unit, Include, Target, Actual, Expected score,
Actual score, and Direction. Green Include/Target/Direction cells are editable.
Actual links to explicit Done and result fields in Daily. Expected score is 100
for an included positive target. Higher-direction Actual score is actual/target
× 100; lower-direction is target/actual × 100. Lower-direction zero results remain
unscored. Daily performance takes the median of the session's score rows, and
Scored metrics / Planned metrics makes partial coverage visible.

The example calculates **Planned intensity** on a whole-number **0–10** scale
from exercise assumptions and planned volume (0 means no planned demand,
10 means highest planned demand). Optionally enter **Effort rating** (1–5)
afterward to record how hard it felt, or leave it blank. Neither rating affects
the performance calculation. No duration × RPE score is required or inferred.
When extending the workout layout, update Scoring's actual-cell references,
explicit targets, and the Daily median/count ranges for that session.
Recalculate and save the XLSX before syncing.

### Exercise-based planned intensity formula

The **Exercise arsenal** has **Base intensity** (0–10) in **C36:C90** and
**Unit** in **D36:D90**. Base intensity means the difficulty of one rep, or one
second of a timed exercise. It is a rating, not additive intensity points.
There are no per-exercise reference sets or reference amounts.

Daily's session rating is a **volume-weighted average** of those base values:

```text
planned_amount_i = sets_i × reps_or_seconds_per_set_i
weight_i = planned_amount_i                         for reps
weight_i = 2 × planned_amount_i                     for reps per leg
weight_i = planned_amount_i / seconds_per_rep        for timed work
session_intensity = ROUND(SUM(base_intensity_i × weight_i) / SUM(weight_i), 0)
```

The result stays between 0 and 10 without capping a sum. More work at a higher
base intensity pulls the session average up; more work at a lower intensity
pulls it down. Doubling every exercise's sets leaves intensity unchanged and
increases volume. All zero base values or all zero sets give a rating of zero.
Missing inputs leave the rating blank.

To combine rep and timed exercises, **Scoring!O1** holds one editable weighting
assumption: **3 seconds per rep equivalent**, initially. This is a planning
conversion, not a measured rep tempo. Per-leg amounts count both legs. Unlike
units are converted before weighting. Adjust this assumption to change the
relative weight of timed work; no exercise-specific reference prescriptions
are needed.

The calculation is visible in **Scoring → N:Y**. Green **P:S** cells contain
Exercise, Unit, Planned sets, and Amount per set. **T** looks up Base intensity,
**U** calculates the total amount, **V** calculates its volume weight, **W**
checks the arsenal unit, and **X** calculates base intensity × volume weight.
For example, **X5** uses:

```excel
=IF(OR(COUNT(T5:V5)<>3,Q5<>W5,T5<0,T5>10),"",T5*V5)
```

**Daily!AG3** combines the first session's exercise rows:

```excel
=IF(COUNT(Scoring!X5:X11)<>ROWS(Scoring!X5:X11),"",IF(SUM(Scoring!V5:V11)=0,0,ROUND(SUM(Scoring!X5:X11)/SUM(Scoring!V5:V11),0)))
```

Every Daily row has its own session range; all 48 sessions are populated. Missing
or duplicate exercise names, unit mismatches, invalid sets, or incomplete inputs
leave the rating blank. Sets must be nonnegative whole numbers; amounts and the
seconds-per-rep assumption must be positive. Zero sets omits an exercise.

For example, 20 reps at base intensity 8 and 40 reps at base intensity 2 give
`(20 × 8 + 40 × 2) / (20 + 40) = 4`. The exercise base values remain 8 and 2;
the session's volume determines their weights.

The numeric volume inputs are initialized from the written Daily plan.
**Changing the plan text does not rewrite these inputs.** Update Scoring's sets
and amounts alongside the plan and the separate performance targets in **F**.
Each Core round includes four 30-second work intervals, with rest excluded.
Clusters count both reps; lowering tempo does not add separate hold time.
Ranges and tests use their stated upper bounds, and optional work is included
until its sets are zero. Scoring's Prescription note records these assumptions.
The seeded base values are editable difficulty estimates; the four Core
exercises start at 6, 4, 5, and 5. Optional felt effort and actual/target
performance remain separate from planned intensity.

The plugin's Analytics folder separates **Daily**, **Sheet**, and
**Smartwatch**, plus **Combined** for source totals and intensity/heart-rate timelines. `Daily/Index.md` is the date index; `Daily/YYYY-MM-DD.md` holds that day's
sheet sessions, scores, sets, and Garmin activities. Log dates link to these
notes. Existing Daily reflections remain on the index, and each day has its
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
