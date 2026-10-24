## Flexible Daily tracking

A/B/C, Cal-Intervals, and five set columns describe the example workbook only. They are
not required exercises or limits. Preserve the supplied layout while filling it; choose a different format below
only when deliberately redesigning tracking. The plugin reads
your selected tracking tab; its name does not have to be Daily.

Start with **Settings → Sports → Workbook guide → Open guide**. Choose **Blank
template** for empty training inputs or **Example workbook** for filled workouts
and scoring. Both blank formats retain the full six-sheet structure without
training data or cell formulas. Use [Workbook.md](Workbook.md)
to fill or adapt your file, manually or with a chatbot, before uploading and syncing.

Keep activities managed in Recurring out of Daily. Only manual Daily sessions
receive set results and Scoring summaries. For durations, prefer `minutes` with
`20` for a 20-minute effort; use seconds for short holds.

### Recommended: one row per set or measurement

Use these exact headers. Additional sets and exercises add rows, not columns.

| Date | Session ID | Exercise | Set | Unit | Target | Result | Done |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | strength-1 | Squat | 1 | reps | 8 | 8 | TRUE |
| YYYY-MM-DD | strength-1 | Squat | 1 | kg | 60 | 55 | TRUE |
| YYYY-MM-DD | strength-1 | Squat | 2 | reps | 6 | | FALSE |
| YYYY-MM-DD | strength-1 | Squat | 2 | kg | 65 | | FALSE |
| YYYY-MM-DD | strength-1 | Farmer carry | 1 | m | 30 | 25 | TRUE |
| YYYY-MM-DD | strength-1 | Wall hold | 1 | seconds | 00:30 | 00:25 | TRUE |
| YYYY-MM-DD | intervals-1 | Run work | 1 | seconds | 60 | | FALSE |
| YYYY-MM-DD | intervals-1 | Run recovery | 1 | seconds | 90 | | FALSE |

These rows are illustrative, not imported training achievements.

- Required headers: **Date, Exercise, Set, Unit, Target, Result**. An optional
  **Session ID** distinguishes sessions on the same date; keep IDs stable.
  Without it, identity is Date + Block, so repeat Block on every row of that
  session (or leave it blank on every row).
- **Exercise** is any name. **Set** is any positive whole number, not a fixed
  1–5 range. Rows sort by set number; gaps retain their original labels.
- **Unit** is explicit and customizable: reps, reps/leg, seconds, minutes, m, km,
  kg, rounds, RPE, %, or another metric. Separate rows with the same exercise and
  set can record several metrics, such as reps and load. Exercise + unit + set
  must be unique within a session. Each unit stays separate in tables and graphs.
- Optional **Aggregate** controls each exercise/unit graph: `total` (default),
  `average`, `min`, `max`, or `last`. Set it consistently on all rows of that
  exercise/unit. For example, use `average` for kg or RPE, `max` for peak load,
  and `total` for volume or time. Individual set values always remain visible.
- **Target** and **Result** are independent nonnegative numbers or blanks. Targets
  can vary every set. Blank target means no numeric target; blank result means
  unrecorded. Zero is a real value. Text instructions belong in **Plan** or **Notes**.
- Time units accept numbers, native Excel times, `mm:ss`, or `hh:mm:ss`. Numeric
  minutes convert to seconds; colon times always mean a duration, independent of
  the chosen time unit. Other units remain exactly as named (no km/m conversion).
- With a **Done** column, only TRUE records a result. FALSE and blank are distinct
  unrecorded states. Without that column, a nonblank Result is an explicit result.
  Targets alone never become achievements.
- Optional session fields: **Block, Part version, Title, Sport, Plan, Status,
  Planned minutes, Actual minutes, Notes**, and custom columns ending in ` result`.
  Set Block and Part version on the first row of a linked session. Other shared
  metadata may appear once or repeat consistently. Conflicting values are rejected;
  notes from different rows are retained. Date is required on every row.
- **Plan** is free text. Structured targets and results drive the graphs without
  parsing instructions. Use it for supersets, tempo, rest, AMRAP/EMOM instructions,
  technique cues, or descriptions of a training regime.
- A session's Status is independent of set completion. Use `completed` explicitly
  when appropriate. Without Status, recorded results mean `in-progress`.
- Keep goal measurements in custom ` result` columns with the same exact names
  used by Strategy's goal mappings. They are independent of set metrics.

There is no fixed exercise count, no mandatory Cal-Intervals, and no five-set limit in
this format. It supports numeric measurements for varied regimes; the plugin
does not infer exercise relationships or automatically score a regime.

### Existing format: one row per session

Existing grouped or flat Daily workbooks remain supported. When a tracking
redesign is requested, rename/add/remove exercise groups or extend set columns. A grouped
heading can be `Squat`, `D`, `Intervals`, or any other name, above **Done** and
**1, 2, 3, …** (or **Rounds**). Structural columns retain their existing names.
Do not merge two exercise groups under the same name.

Flat equivalents are `Squat done`, `Squat 1 result`, `Squat 2 result`, etc.
`Circuit done` with `Circuit rounds result` also works. Numbered inputs and rounds
remain gated by the corresponding Done flag. Both the blank template and filled example use one manual
**Session done** flag for all skill results. Adjust values before selecting TRUE.
Cal-Intervals rounds greater than zero are then recorded; zero or blank means
not done and remains unscored. Session done TRUE marks the session completed;
the provided files have no separate Status column.

For numeric comparisons, match the group name in Plan, one prescription per line:

```text
Squat) Back squat: 6 x 5
Carry) Farmer carry: 4 x 30 m
Hold) Wall hold: 3 x 20 sec
Circuit: 4 rounds
```

Group names, exercise names, units, and set counts are configurable. Compound
instructions stay readable as text. Prefer the row-based format for changing
per-set targets or recording multiple metrics instead of encoding these in prose.
Example metadata `max_sets` and `max_reps` are descriptive; they do not impose
import limits or automatically resize a workbook.

### Where the changes appear

Open the Sports dashboard and select **Open analytics**, **Open plans**, **Open weekly note**, or
**Open training log**. The dashboard also exposes **Tracking guide** and expandable
**Sets and plan/result comparison** panels. Use **Sync now** to import workbook
changes. Confirm **Settings → Sports → Tracking sheet** selects the intended tab.

Upcoming manual prescriptions appear in **Plans**. Results and comparisons live
in day notes and **Analytics/Log.md**. **Open analytics** opens **Stats.md** for
source totals and trends. Open **Analytics/Sheet.md** and
**Analytics/Smartwatch.md** from Overview or find them with `sports/analytics`. Weeks remain the primary planning pages. **Analytics/Days/_Index.md** links to
`Analytics/Days/YYYY-MM-DD.md`, combining that day's sheet sessions, scores,
individual sets, and Garmin activities. Log dates link there too. Only today and
earlier dates with source entries receive day notes; upcoming sessions stay in
Plans. Existing day-index reflections stay on the index. Each day has a protected
generated section and a separate reflections area. Exercise details contain a
four-column table and a compact pipe chart: exercises along the x-axis,
reps/rounds on the left and time on the right. Purple hollow points show the plan;
green points show results. Other units use separate charts.
Missing targets and results stay missing; partial totals are labeled. Graphs use
your selected aggregation (total by default); those totals are not a
training score, and larger values are not automatically better. Set values remain
available for meaningful interpretation.

Charts render locally with the plugin enabled in reading view or Live Preview;
plain source mode shows the readable `sports-compare` block. No network chart
service is used. Existing notes and commentary retain their conflict protection.


### Properties, tags, and recovery

Overview is the navigation hub. Day notes keep **date** and a linked **week** in
properties; routine **targets** link to goal notes. Weekly dates, phase and program
week also live in properties. Benchmarks, sets, scores and reflections stay in the body.
Sync updates these managed properties while preserving unrelated custom properties.

Shared tags connect related pages: `sports/training` groups logs, days and weeks;
`sports/analytics` groups Stats, Sheet and Smartwatch; `sports/planning` groups plans,
calendars, routines and weeks; `sports/goals` groups Plans, goals and routines.
Running and swimming routines and matching goals also share sport tags.
Custom tags are preserved; Sports maintains its own tag groups.

Keep the hidden generated-section markers and write reflections outside them.
Use **Generate notes from imported data** for a cached refresh and **Recreate
missing notes** for deleted files. A generated-section conflict needs its original
content restored, or a deliberate backed-up rebuild through **Clear cached data**
followed by **Sync now**. A reset preserves note files and settings; each existing
target note is backed up before rebuilding. Edits inside generated sections are
kept in those backups, while outside reflections remain in place.

Pending recovery continues when Garmin notes return after workbook sync. There
is no need to delete the notes folder or repeatedly reset the cache. Damaged
markers still need repair. See [Sync recovery](Workbook.md#sync-recovery) for details.

### Intensity, performance, and optional felt effort

The filled example keeps **Planned intensity** and **Effort rating** in Daily.
The unified Scoring table holds performance and coverage, imported automatically.

- **Intensity:** the example calculates planned intensity from 0 to 10 using
  the exercise arsenal's base values and Scoring's planned sets and amounts.
  Update those numeric inputs when changing the written plan. See
  [Workbook.md](Workbook.md#load-adjusted-intensity-formula) for the formula.
- **Performance:** compare recorded results with positive targets using
  result/target × 100. Performance is the median of available metric scores;
  100 meets the target. Session summaries appear on the first exercise row.
  Review Scored metrics / Planned metrics because partial results can still score.
- **Felt effort:** optionally rate how hard it felt after training, from 1 (easy)
  to 5 (very hard), or leave Effort rating blank. It never changes performance.

Felt effort starts blank. Planned intensity uses exercise volume, including
timed work converted using Scoring's shared seconds-per-rep weighting assumption.
The rating averages exercise base values (0–10), weighted by planned volume. Recalculate
and save the workbook before syncing. Analytics/Sheet uses time on the horizontal
axis for all three charts. Performance is shown as intensity × performance / 100 on the same scale as
intensity, so 100% follows intensity and 80% sits 20% below it. Values may exceed
10 when performance exceeds 100%. Scaling is per session before daily medians. Effort versus intensity uses 0–5 on the
left and 0–10 on the right; actual effort ratings remain 1–5. The third chart
shows actual performance only on a fixed 0–200% scale with 100% at the center. Each series uses daily medians of
available values, so intensity can appear before results. Missing values leave
gaps. Log and dated day notes retain session coverage and felt-effort ratings. Zero is valid for
performance and intensity, but not a recorded felt-effort rating.

Scoring is not an extra import mapping; keep tracking on Daily or your chosen
tracking tab. Customizing exercises means adapting Scoring's actual references,
targets, and the session's median/count ranges too. Existing cloud workbooks are
never overwritten by template downloads. Apply new formulas to a copy preserving
recorded history, or use the template for a new plan.


## Added weights without widening Daily

Use the **Loads** tab only for weighted exercises. Each row identifies a date,
session, exercise and equipment, with planned and actual kg side by side.
Bodyweight sessions need no rows. Exercise ratings and growth per kg live in
**Library**, alongside equipment limits. Actual kg stays blank until recorded;
Done does not copy planned kg into it. Added load appears in a separate kg chart.
The weighted intensity formula and the end-of-plan recap are described in
[Workbook.md](Workbook.md).
