## Flexible Daily tracking

A/B/C, Core, and five set columns describe the example workbook only. They are
not required exercises or limits. Choose either format below. The plugin reads
your selected tracking tab; its name does not have to be Daily.

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

There is no fixed exercise count, no mandatory Core, and no five-set limit in
this format. It supports numeric measurements for varied regimes; the plugin
does not infer exercise relationships or automatically score a regime.

### Existing format: one row per session

Existing grouped or flat Daily workbooks remain supported. Rename exercise groups,
add/remove groups, and add as many numbered set columns as you need. A grouped
heading can be `Squat`, `D`, `Intervals`, or any other name, above **Done** and
**1, 2, 3, …** (or **Rounds**). Structural columns retain their existing names.
Do not merge two exercise groups under the same name.

Flat equivalents are `Squat done`, `Squat 1 result`, `Squat 2 result`, etc.
`Circuit done` with `Circuit rounds result` also works. Numbered inputs and rounds
remain gated by the corresponding Done flag.

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
Template metadata `max_sets` and `max_reps` are descriptive; they do not impose
import limits or automatically resize a workbook.

### Where the changes appear

Reload **Sports** under **Settings → Community plugins** after installing a build.
Then open its dashboard and select **Open plans**, **Open weekly note**, or
**Open training log**. The dashboard also exposes **Tracking guide** and expandable
**Sets and plan/result comparison** panels. Use **Sync now** to import workbook
changes. Confirm **Settings → Sports → Tracking sheet** selects the intended tab.

Upcoming manual sessions appear in **Plans**, not the past **Log**. In generated
notes, expand a session's **sets and comparisons** card. It contains a four-column
table and paired plan/result bars. Each exercise/metric uses its own scale.
Missing targets and results stay missing; partial totals are labeled. Graphs use
your selected aggregation (total by default); those totals are not a
training score, and larger values are not automatically better. Set values remain
available for meaningful interpretation.

Charts render locally with the plugin enabled in reading view or Live Preview;
plain source mode shows the readable `sports-compare` block. No network chart
service is used. Existing notes and commentary retain their conflict protection.
