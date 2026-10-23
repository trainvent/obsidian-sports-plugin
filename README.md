# Sports

An Obsidian plugin developed by [Trainvent](https://github.com/trainvent).

## Alpha release

Plan training in spreadsheets and follow it in Obsidian: recurring schedules,
a combined calendar, workout logs, and individual goal notes. Read an XLSX from a downloadable
cloud link, with optional Garmin activity and Coach imports.

Version 0.3.0 is an early alpha. Obsidian 1.11.4 or later is required. Sports is desktop-only because workbook and Garmin connections use Node.js APIs.
Garmin uses unofficial endpoints and Coach integration still needs live account
verification. Keep a backup of your workbook and vault when trying the alpha.

Download `main.js`, `manifest.json`, and `styles.css` from the GitHub release.
Place them in `<vault>/.obsidian/plugins/sports/`, reload Obsidian, and
enable **Sports** under **Settings → Community plugins**. The alpha is not yet
listed in Obsidian's community directory.

## Get started

1. Build the plugin, reload Obsidian, and enable **Sports**.
2. Select **Download template** in settings, or run **Sports: Download example workbook**.
   Your browser saves the generated XLSX; the plugin does not choose a filesystem path.
3. Upload it to Nextcloud or another cloud service. Paste its HTTPS download/share
   link into **Settings → Sports → Cloud workbook link**, then select **Sync now**.
4. Edit the workbook in your cloud spreadsheet editor, or upload a revised copy,
   then sync again. The plugin reads it without modifying the cloud file.
5. Edit recurring activities in the workbook **Recurring** tab. Select **Open weekly
   note** to create or refresh that week's note.

For everyday edits to your **Daily** sheet, try [Calcrow](https://calcrow.com/),
also developed by Trainvent. Save your changes to the cloud workbook, then sync Sports.

**Settings → Sports** offers a cloud workbook link, notes folder, startup sync,
and intervals of five, ten, or fifteen minutes, or one hour. Startup sync is on
and the interval is ten minutes by default. Select **Manual only** to disable periodic sync.
Scheduling runs inside Obsidian; closed apps and mobile suspension stop or delay it. No external scheduler or Python installation is required.

Generated notes default to `Sports/Strategy.md` and `Sports/Weeks/YYYY-MM-DD.md`
inside the user's vault. Sync refreshes the strategy and previously generated weekly
notes. Edit recurring activities in the XLSX, then sync to refresh the dashboard
and weekly notes.

Only HTTPS cloud sources are supported. Old local paths are rejected with guidance
to upload the workbook and paste its share link. Failed downloads retain the last
imported plan. No external filesystem access is used by the plugin.

## Add today to your own dashboard

Paste this into any note:

```sports-today
```

In Reading view or Live Preview, it shows today’s sheet sessions, Garmin activities,
and enabled recurring activities, with an **Open weekly note** button. On Sundays,
**Reflect on the week** jumps to the weekly review. It refreshes after sync and when
the date changes, using cached data.

## Workbook format (prototype schema 1)

Use the [example workbook](templates/Training-example.xlsx), or select **Download template**
in Sports settings to save a generated copy through the browser. It uses **Strategy**, **Recurring**,
and **Daily** tabs, plus a **Scoring** sheet for editable performance metrics. The fixed example contains 12 weekly plans and 48 manual sessions;
actual results are blank. Template download and note sync save `Guide/Workbook.md` inside the configured
vault notes folder (by default `Sports/Guide/Workbook.md`), preserving an existing guide. No customization flow is required. Give the workbook and
[Workbook.md](Workbook.md) to your own chatbot to adapt it safely.

Green marks editable entry cells; neutral white/gray marks reference information
and formulas. Both alternate row tones, and headings stay neutral blue-gray.
See [Workbook.md](Workbook.md) for the exact grouped layout and recording rules.
Plugin-created copies start next Monday and use the local timezone. The browser controls where downloaded copies are saved. Select Strategy, Daily, and Recurring as the strategy, tracking, and weekly schedule
sheet mappings. Each sheet can be imported independently or disabled by leaving
its mapping blank. The older templates and formats remain supported.

In settings, choose the exact **Strategy sheet** and **Tracking sheet** tab names.
Leave either blank to disable that import; both may be blank for calendar/notes-only
use. You can rename tabs and keep other sheets in the workbook. Selected tabs still
need the column/table structure below; arbitrary column mapping is not supported.
Disabling a role retains its last imported local data and notes. A selected tab that
is missing or invalid fails the import rather than silently clearing data. With only
tracking selected, a strategy is not required and paired part references may remain
unresolved. A new tracking-only plan uses the device timezone until strategy supplies one.

Sync creates ordinary Markdown files in the configured **Notes folder**:

- `Plans.md`: starting levels, goals, weekly links, and upcoming manual prescriptions.
- `Analytics/Index.md`: navigation to Daily, Sheet, Smartwatch, and Combined. Session results live in Log and dated day notes; the old Table note is retired.
- `Analytics/Daily/Index.md`: date index, preserving reflections from the previous all-days note.
- `Analytics/Daily/YYYY-MM-DD.md`: one combined day note with sheet sessions,
  scores, individual sets, exercise comparisons, Garmin activities, and reflections.
- `Analytics/Sheet.md`: sheet intensity, performance, and felt-effort trends.
- `Analytics/Combined.md`: separate source totals over time, plus intensity and heart rate on independent axes.
- `Analytics/Smartwatch.md`: weekly volume, running pace/heart rate, and swimming pace/heart rate.
- `Log.md`: today and earlier manual sessions, newest first, with results and notes.
- `Strategy.md`: goals, exercise blocks, and regular weekly activities.
- `Weeks/YYYY-MM-DD.md`: weekly focus and targets, that week's schedule and results,
  and an editable review section.

Weekly notes are created automatically for dates in the log and in **Week plans**,
plus the current week. Previously generated weeks are refreshed too. You can browse
these files in Obsidian's file explorer without opening the plugin dashboard.
Reloading the plugin generates notes from cached imported data; the **Generate
notes from imported data** command does the same without rereading the workbook.
Legacy plugin notes `Plan.md` and `complete-log.md` (or `Training log.md`) migrate
to `Plans.md` and `Log.md`. Renames preserve personal sections and trusted generated
baselines. If both old and new files exist, the plugin reports the conflict instead
of overwriting either. Existing original Fitness notes managed by the Python
refresh scripts use different markers and are not adopted or replaced by the plugin.
Dates split at today in the strategy timezone. The names match the original
Fitness folder's `Log.md`, `Plans.md`, and `Strategy.md`.

Edit the workbook to change plans and record results. Commentary outside generated
sections is preserved. Conflicting notes are reported without preventing other
weekly notes from updating. The existing Fitness vault is a reference; the plugin
writes only to the configured folder in the currently open vault.

Generated-note writes are serialized through their baseline saves. Obsidian's
automatic rewrites of exact known plugin note-renaming links do not count as
manual edits; other link changes, aliases, prose edits, and damaged markers stay
protected. A successful final note refresh clears stale note warnings while
preserving workbook import failures. The retired Table note is not recreated.

Each table begins
with its name alone in column A, followed immediately by a header row and data rows.
Separate tables with a blank row. These are simple labeled ranges, not Excel named
tables; no formulas or AI interpretation are needed. The example command generates
this layout with three goals and training parts A/B.

On **Strategy**, include:

| Table label | Headers |
| --- | --- |
| `Plan` | `schema_version`, `plan_id`, `plan_name`, `timezone` |
| `Goals` | `goal_id`, `title`, `benchmark`; optional `baseline`, `test`, `category` |
| `Parts` | `part_id`, `version`, `title`, `prescription` |
| `PartGoals` | `part_id`, `version`, `goal_id` |

The optional Goals `category` is `milestone` for a new capability or `maintenance`
for an ability to maintain or improve. Blank or missing categories default to
`milestone`, keeping older workbooks compatible. Strategy and Plans notes display
**Aspiration** and **Maintenance** separately. The example
classifies the three skills as milestones and running as maintenance. Its Core
part links to all three skill goals through PartGoals, shown as **Supports** in
the strategy note. Add goal links to any training part in the same way.

`Plan` contains exactly one row. Set `schema_version` to `1` and use an IANA timezone,
such as `Europe/Berlin`. Each `PartGoals` row links one part version to one goal.

Optionally add a **Week plans** table to Strategy:

| Week | Start | Phase | Focus | Targets | Advance when | Minutes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | YYYY-MM-DD | Foundation | Establish starting level | Record controlled variations | Review results before progressing | 160 |

`Week` is a unique positive program-week number. `Start` is a unique Monday date.
`Phase` and `Focus` are required; other fields may be blank. You can plan 12 weeks
or another length. Enter explicit weekly targets rather than relying on automatic
increases. Review results each week and edit the remaining plan when repeating or
adjusting a week. Weekly targets and dated session plans are separately editable;
changing a target does not silently rewrite daily sessions or shift dates.

The offered **Daily** sheet has two header rows: wide A/B/C exercise headings
above Done and numbered rep/time fields 1–5, followed by Core Done/Rounds, All done, Notes and
three optional manual goal-result columns. Plan stacks the exercises on separate
lines. Green cells are editable; both green and neutral areas alternate row tones.
Older **Training log** sheets with a single flat header row remain supported.

Use one row per session (several rows can share a date), with block `A`, `B`, `Technique`, or `Empty` in the example.
`Block` links to a Strategy part's `part_id`; you may define your own block names.
`Plan` stays readable free text and is shown in Obsidian without AI interpretation.
Use `Empty` or an empty block for a day without a manual prescription.

- Required columns: `Date`, `Block`, `Plan`.
- Optional `Title` names activities such as swimming or running without a skill block.
- Optional `Planned minutes` and `Actual minutes` accept nonnegative numbers or blank.
- Use a unique `Session ID` for every row when several sessions share a date and block.
  Keep IDs unchanged when adjusting plans so imported sessions retain their identity.
- Customize skill columns using the suffix ` result`, such as `Squat result`.
- Completion flags use ` done`, such as `Core done`, with TRUE, FALSE, or blank.
- `Notes` is optional. Additional optional fields are `Sport`, `Status`, `Session ID`,
  and `Part version`.
- Results and completion flags remain separate. An entered result or a TRUE flag
  means `in-progress`, never automatic completion of the whole session. Explicit
  `Status` supports `planned`, `in-progress`, `completed`, `skipped`, and `cancelled`.
- Without `Session ID`, identity uses Date + Block. Keep these stable for existing
  entries; add distinct Session IDs if the same block occurs twice on one date.
- With strategy selected, each nonempty block must resolve to one part/version.
  Add `Part version` when the same block has several strategy versions. Tracking
  works on its own with strategy disabled.

The technical `Sessions` table remains supported for existing workbooks, with required
`session_id`, `date`, `sport`, `title`, and optional `part_id`, `part_version`,
`planned_minutes`, `actual_minutes`, `result`, `status`, and `notes` columns.

### Sets and plan/result comparisons

Log provides the session overview. Analytics contains dated Daily notes with
sets and exercise comparisons, while Graph compares performance and effort.
Plans contains upcoming prescriptions without result columns or comparison cards.
Log and weekly notes retain their contextual session comparisons.
Open a card to see a four-column exercise table with the planned prescription,
recorded total, and sets in order, plus paired plan/result bars. Overview tables
keep results compact instead of listing all numbered workbook columns.

The chart reads only explicit lines such as `A) Pull-up: 3 x 5`,
`B) Wall hold: 3 x 20 sec`, `C) Pistol: 3 x 5/leg`, `A) Mobility: 2 min`,
and `Core: 5 rounds`. Custom group names and set counts, `x` or `×`, and explicit metric units are
supported. For variable targets and multiple metrics, see [Flexible Daily tracking](Tracking.md). Other plan wording remains visible without a numeric comparison.
Each exercise has its own scale and unit; reps, seconds, reps per leg, and rounds
are never added together. More training is not automatically a better result.

Mark the exercise's **Done** flag TRUE after recording its set values. Prefilled
inputs with FALSE or blank Done flags remain unrecorded. Blank sets stay missing,
zero is a real recorded value, and partial totals are labeled. Excel time cells
and `mm:ss` results become seconds for timed comparisons. Text results stay
visible in the sets table and are excluded from numeric totals. Session completion
still requires its own Status; exercise flags never mark the whole session complete.

Charts render locally in reading view and Live Preview using the plugin's
`sports-compare` code block. The underlying tab-separated values and Markdown table
remain readable outside Obsidian or with the plugin disabled. No chart service,
network request, or additional plugin is required. Refresh uses the existing
protected generated sections and preserves commentary outside those sections.

Dates may be spreadsheet dates or ISO text (`YYYY-MM-DD`). No achievements,
session durations, or distances are inferred from plan prose. Distance fields, exercise tables,
progression rules, import previews, custom intervals, and per-occurrence recurrence
edits remain planned. Date display and weekly navigation use the device calendar;
schedule-timezone conversion is not yet implemented. Only one plan is active; changing
to a different strategy plan ID is rejected. Completed sessions cannot change dates or
part references, and versions used by completed sessions must remain unchanged.
Removed completed rows are retained locally; removed uncompleted rows currently
disappear from the active plan.

## Weekly schedule without manual results

The last section of the Strategy sheet is an optional **Weekly schedule** table.
Its seven blank Monday–Sunday rows are ready to fill in. Columns are `Day`, `Time`,
`Minutes`, `Activity`, `Recorded by`, and `Notes`. Enter an Activity to activate a row;
empty activities are ignored. Add rows for multiple activities on the same weekday.
Use a text time such as `18:00` and optional positive minutes.

These activities appear each week in the dashboard and Markdown without manual
result fields in the daily log. `Recorded by` can be Garmin, another tracker, or
No manual log. This records intent only; Garmin activities are imported separately and
scheduled activities are never automatically marked completed.

## Markdown ownership and safety

Synchronization always flows **XLSX → Obsidian**. The plugin never writes changes
back to an existing workbook. Creating a new template is a separate explicit action.
Edit structured plans/results in the workbook and reflections in Markdown. The plugin
updates only its `sports:begin` / `sports:end` blocks and preserves surrounding prose.
If a generated block changes or loses its markers, refresh reports a conflict and leaves
that note untouched. Restore the previous generated block after moving your edits outside
it to resume updates. Renamed/deleted managed notes are not automatically rediscovered;
keep their generated paths stable in this prototype. A deleted generated note is not
silently recreated.

Imports validate selected sheets before replacing cached plan data. Invalid workbooks retain
the prior plan. A valid import can succeed while a conflicting Markdown note remains stale;
the dashboard shows the error and refreshing again retries generation. Durable multi-file
recovery and conflict resolution UI remain planned.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

The development build watches `src/` and writes `main.js` in this folder.
Reload Obsidian after changes and enable **Sports** under
**Settings → Community plugins**.

```sh
npm run build
npm run lint
npm test
```

GitHub Actions runs the build and lint checks on pushes and pull requests.

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/sports/`, then reload Obsidian.
The manifest ID is `sports`; the installed plugin folder must use this same name.

## Releases

Update the version with `npm version patch`, `npm version minor`, or
`npm version major`. The version script updates `manifest.json` and `versions.json`.
Push the commit and its version tag to GitHub. Tags must match the manifest version
exactly, without a `v` prefix; for example, `1.0.1`.
The release workflow builds the plugin and creates a draft release containing
`main.js`, `manifest.json`, and `styles.css`. Review and publish the draft on GitHub.

## Privacy

External requests are disabled unless you configure a cloud workbook link or connect
Garmin. Workbook sync downloads only the configured HTTPS source and never uploads
or edits it. The share URL is saved in plugin settings and may grant access to
anyone with the link. The generated template is offered as a browser download;
the plugin does not read or write files outside the vault.

Imported training data, sync preferences, and generated-block baselines are stored
in vault-local plugin settings. These may travel with your vault sync provider.
Generated notes and the workbook guide are written through Obsidian's vault API.
Garmin tokens use Obsidian secret storage; credentials are never saved. No
telemetry is collected. Plugin settings and compiled output are excluded from
version control.

## License and attribution

Based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
The original copyright notice and 0-BSD license are retained in [LICENSE](LICENSE).
Bundled dependency licenses and attribution are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
and included in the distributed `main.js`, including fflate, read-excel-file, its
saxen-derived parser, worker-f, and garminconnect-js.

Regular weekly activities are managed in the workbook Recurring tab and imported
into the strategy note.
**Show regular activities** defaults to off in Sports settings. Enable it to include
workbook weekly activities in the dashboard and weekly
notes. Changing it refreshes generated notes from cached data. The log and plans notes
contain only explicit Training log rows; dated sessions entered there remain
visible regardless of this setting.

If you delete generated notes to start again, use **Settings → Sports →
Recreate missing notes** (or the command with that name). It rebuilds missing notes
from the last successfully imported workbook, keeps existing files protected, and
clears the missing-note error after success. Sync the new workbook first if you
want to use its schedule. Removed historical weeks outside the current plan are
not recreated. Reloading the plugin alone does not reset saved note baselines.

For a full fresh start, use **Clear cached data**, then **Sync now**. This clears
the imported plan (including cached history), note baselines, and the last error.
Workbook settings are kept; note files are not deleted.
On the next sync, existing target notes are backed up in the notes folder's
`Backups/<timestamp>/` directory before generated sections are rebuilt. Commentary
outside generated markers is preserved. Invalid markers and notes managed by the
original Fitness scripts still require attention. Resetting the cache does not
recover training results that were never saved in the workbook.


## Garmin activity sync

On desktop, select **Settings → Sports → Connect Garmin**. Sign in with your
Garmin email and password, then enter the verification code if requested. No Python,
terminal commands or separate installation are required. This connection is experimental
until sign-in, MFA and token refresh have been checked with a live account.

Connecting explicitly enables network access to Garmin and starts an activity import.
Passwords and verification codes are held only in the sign-in dialog and are never
saved. Session tokens are saved through Obsidian's secret storage, separately from
plugin settings and generated notes. Obsidian 1.11.4 or later is required.

The bundled [garminconnect-js](https://github.com/DynamicsNinja/garminconnect-js)
client uses unofficial Garmin Connect endpoints. It also downloads public OAuth
application keys from `https://thegarth.s3.amazonaws.com/oauth_consumer.json`; no
credentials or activity data are sent to that host. This is JSON data, not remote
executable code. Garmin can change these endpoints or limit sign-ins. This feature
currently supports Garmin accounts on garmin.com, not garmin.cn.

Set **Garmin history start** to the first date to import. The initial default is 90
days ago. While Obsidian runs, automatic sync checks Garmin at most once an hour,
using the configured sync timer. **Sync now** requests an immediate refresh.
Garmin refreshes independently when workbook import fails. With all three workbook sheet
mappings blank, it can also run without a workbook.

Only activity ID, local date/time, name, type, duration, distance and average heart
rate are cached in the vault's plugin data and shown in **Log**, weekly notes and the
dashboard. No GPS routes or complete account responses are retained. Activities use
Garmin's local start time; GMT-only records use the plan's timezone, or your local
timezone without a plan. Garmin records never mark manual sessions complete.

Each successful refresh replaces the selected date range, so activity edits and
deletions do not create duplicates. On failure the previous snapshot remains visible
with a warning. **Disconnect** clears the saved tokens and stops Garmin requests;
cached activities remain available. **Clear cached data** removes the imported
activity cache while keeping connection settings. Generated notes and reflections
keep their existing edit protection.


The Log note combines manual entries and Garmin records in one daily table:
**Date**, **Manual plan**, **Manual results**, **Garmin activities**, **Manual notes**.
Today and earlier dates appear newest first, including dates with only Garmin data.
Multiple sessions and activities stay together in their date's row. Manual status,
actual minutes and result fields remain independent from recorded Garmin measurements.
Upcoming manual sessions stay in Plans.

Log dates link to their notes in `Analytics/Daily/`. Sync creates a note for each
date up to today that has a sheet session or Garmin activity, including days with
only one source. Per-day reflections stay outside the protected generated block.

Each manual session also shows planned intensity, actual performance, scored
metric coverage, and optional felt effort. Expand its session details below the
overview for scores, individual sets, and exercise comparisons. Missing ratings
remain unrecorded, and separate sessions keep their own scores and coverage.



## Goal notes

Sync creates `Goals/<goal_id>.md` under the configured notes folder and links each
goal from Plans and Strategy. Each note includes the baseline, target, dated XLSX
entries, matching Garmin activities, and a separate review area that sync preserves.

Both data sources are available to every goal. Aspiration/maintenance categories
only describe the goal; they do not select a data source. The optional Goals fields
`result_column` and `garmin_types` provide explicit mappings. Existing skill-column
names and running/swimming goals are detected when no mapping is supplied.
Garmin matching uses type keys rather than localized activity names such as Laufen.
The updated template includes swimming as a maintenance goal and source mappings
for all five example goals. Existing workbooks are never changed by sync; add a
swimming Goals row to an existing workbook if you want its note as well.

Goal filenames follow stable IDs so renaming a goal title keeps its review file.
Removed goals' existing notes are retained. Editing generated sections still raises
a conflict; write personal reviews below the generated block instead.

### Optional Garmin Coach plans

Enable **Show Garmin Coach plans** in the plugin settings to include published
adaptive Coach workouts in `Plans.md`. This is off by default. When enabled, sync
reads Garmin's scheduled-workout summaries for the next 28 days, starting today.
It displays dates, workout names, sport, estimates, and published descriptions;
it does not import full workout steps or change anything in Garmin.

Coach schedules have a separate local cache and refresh status. Failed refreshes
retain the previous schedule with a warning while activity imports can continue.
Garmin may publish only a few sessions ahead and can change them after training;
check Garmin Connect for the current workout prescription. Self-scheduled workouts
and static training plans are excluded. Turning this setting off removes the
section from generated plans and stops Coach schedule requests. Disconnecting
Garmin stops all Garmin requests and retains cached summaries locally.

### Combined plan calendar

`Calendar.md` provides one chronological table for today and upcoming dates,
with recurring weekly training, XLSX daily plans and optional Garmin Coach plans side by side. Multiple
workouts share one date row. Open it through the **Calendar** link in `Plans.md`.
The existing weekly and daily views remain available. Weekly strategy is not
expanded into invented daily sessions. Coach visibility follows **Show Garmin
Coach plans**; blank cells mean no imported prescription, not a rest day.
Recurring training comes from the workbook weekly schedule and appears for the next
28 days, plus any later imported daily or Coach plan dates. This calendar column
is independent of the weekly-note regular-activity visibility setting.
Write personal calendar reviews below the generated section; sync preserves them.

## Read-only cloud workbooks

In **Cloud workbook link**, paste a Nextcloud share link to the XLSX file itself,
for example `https://cloud.example/s/SHARE_TOKEN`. The plugin adds `/download`
automatically. Direct HTTPS file-download links also work. For this first version,
the share must allow downloads without a password or account login; folder shares,
Nextcloud Office editor URLs and password-protected shares are not supported.

Configuring a cloud link enables read-only downloads from that server during manual
and configured automatic sync. No workbook content is uploaded or edited. The link
is saved in ordinary plugin settings and grants access to anyone who has it.
Downloads are limited to 5 MB and 30 seconds; redirects stay on the same HTTPS
server. Invalid links or download failures preserve the last imported plan and
notes. Local filesystem paths are not supported. Download the template from
settings and upload it to Nextcloud yourself. Desktop only for now.

## Support development

[❤️ Sponsor Trainvent](https://github.com/sponsors/trainvent) to support continued development.
For help, use [support](https://next.trainvent.com/de/software-support/) or [report an issue](https://github.com/trainvent/obsidian-sports-plugin/issues).

### Migrating from alpha 0.1.0 or 0.2.0

The early alpha ID `sports-plugin` was invalid for the community directory.
Version 0.2.1 uses `sports`. Disable the old plugin, install the new release in
`<vault>/.obsidian/plugins/sports/`, and copy your old plugin folder's `data.json`
into that folder while Obsidian is closed if you want to retain settings and
sync baselines. Keep the old folder as a backup until the new plugin works, and
enable only the new copy. Generated notes and source workbooks stay in place.

Settings use the searchable declarative API on Obsidian 1.13 or later, with the
same controls rendered through the legacy API on Obsidian 1.11.4–1.12.

The current template defines `max_sets = 3` (exercise groups A, B, C) and
`max_reps = 5` (the numbered rep fields), plus Core separately. These metadata
values do not automatically resize the layout. Rep cells contain plain numbers
or durations displayed as `mm:ss`. Adjust the targets, then select TRUE under
Done to record them. Core uses the same recording rule with an editable Rounds
count. **All done**, after Core, records every group together when TRUE; FALSE
or blank uses the individual Done fields. Adjust result values before confirming.
Whole-session Status is separate. The three goal-result columns are
blank manual inputs, with no formulas. See [Workbook.md](Workbook.md) for details.


### Intensity, performance, and optional felt effort

**Analytics → Smartwatch** provides separate Garmin graphs: weekly recorded
minutes stacked by sport, running pace with average heart rate, and swimming
pace with average heart rate. Pace uses minutes/km for running and minutes/100 m
for swimming, with faster pace higher on the left axis and bpm on the right.
Missing measurements leave gaps; Garmin minutes are not added to workbook
minutes. The note refreshes from cached Garmin data during sync, including when
no workbook is selected, and preserves reflections outside its generated block.

**Intensity** is how hard a session is planned to be, on a whole-number **0–10**
scale. The example calculates **Planned intensity** from the exercise arsenal's
base values and Scoring's planned sets and amounts (reps, reps/leg, or seconds).
Update these numeric inputs when changing the written plan. See
[the formula in Workbook.md](Workbook.md#exercise-based-planned-intensity-formula).

**Performance** compares actual results with targets. In Scoring, **Include**
selects metrics and **Target** remains an explicit editable planning input. Each
included positive target contributes 100 expected points. Actual points are
`100 × actual / target` for **higher**, or `100 × target / actual` for **lower**.
Session performance is the median of available included metric scores.
Lower-direction zero actuals have no finite ratio and remain unscored. Units
are normalized before combining scores; raw reps, time, and weight are never added.

**Felt effort** is optional. After training, enter **Effort rating** from 1 (easy)
to 5 (very hard), or leave it blank. Felt effort starts blank and does not alter
performance. No minutes × RPE calculation is used.

Daily adds six fields: Planned intensity, Effort rating, Expected performance,
Actual performance, Scored metrics, and Planned metrics. Recalculate and save
before syncing. Sheet shows three charts with dates on the horizontal axis:
performance versus intensity, effort versus intensity, and actual daily performance on a fixed 0–200% scale (100% centered). The first plots intensity × performance / 100 alongside intensity on one
shared scale: 100% follows intensity, 80% is 20% lower, and values can exceed
10. The second uses intensity’s 0–10 scale on the right and effort’s 0–5 scale
on the left. Recorded
effort remains 1–5. Each series uses daily medians of available session values.
Intensity appears even without results; missing values leave gaps. Coverage
and individual felt-effort ratings remain in Log and dated day notes. Separate axes compare trends in
different units; matching heights do not imply equal values.

Existing workbooks remain supported. Template downloads never change a live
cloud workbook. Add equivalent score formulas to a copy preserving history,
or start a new plan from the updated template. Keep selecting Daily as tracking;
Scoring is only a formula source. Update its actual-cell references, explicit
targets, and daily median/count ranges together when customizing workouts.
Existing Analytics.md notes with a trusted baseline migrate to Analytics/Index.md,
retaining reflections and generated-section edit protection.
