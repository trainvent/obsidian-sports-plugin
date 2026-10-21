# Obsidian Sports Plugin

An Obsidian plugin developed by [Trainvent](https://github.com/trainvent).

## Status

The TypeScript prototype supports optional strategy/tracking XLSX import, a weekly dashboard,
workbook weekly schedules, manual/interval sync, and protected Markdown generation.
An opt-in Garmin connection is implemented and awaits live account verification.
Cloud workbook sources remain planned in [STRATEGY.md](STRATEGY.md).
Obsidian 1.11.4 or later is required. Local workbook reading and template creation
require desktop. Those actions show an explanation on mobile; cached dashboards
and Markdown remain available. Mobile runtime behavior is not yet verified.

## Try the prototype

1. Build the plugin, reload Obsidian, and enable **Sports Plugin**.
2. Run **Sports Plugin: Create example workbook** from the command palette. This
   creates a fictional workbook at the configured local path, defaulting to
   `~/Sports/Training.xlsx` in your home folder, independent of the system language. Existing files are never overwritten.
3. Run **Sports Plugin: Open dashboard**, then select **Sync now**.
4. Open the workbook with your spreadsheet editor to change plans or record results.
   Save it at the configured local path, then sync again. The workbook stays outside
   the vault; only notes and imported dashboard data belong to Obsidian.
5. Edit recurring activities in the workbook **Recurring** tab. Select **Open weekly
   note** to create or refresh that week's note.

**Settings → Sports Plugin** offers an absolute workbook path (or `~/Sports/...`), notes folder, startup sync,
and intervals of five, ten, or fifteen minutes, or one hour. Startup sync is on
and the interval is ten minutes by default. Select **Manual only** to disable periodic sync.
Scheduling runs inside Obsidian; closed apps and mobile suspension stop or delay it. No external scheduler or Python installation is required.

Generated notes default to `Sports/Strategy.md` and `Sports/Weeks/YYYY-MM-DD.md`
inside the user's vault. Sync refreshes the strategy and previously generated weekly
notes. Edit recurring activities in the XLSX, then sync to refresh the dashboard
and weekly notes.

Local sources use desktop filesystem access, so local paths are device-specific.
A previous vault-relative setting must be replaced with an absolute external path.
The plugin does not move or delete your existing workbook. Missing files and failed
reads retain the last imported plan. Choose another path before creating a second
template. Cloud sources will later provide an alternative for mobile devices.

## Workbook format (prototype schema 1)

Use the [example workbook](templates/Training-example.xlsx), or select **Create workbook**
in Sports settings to create it at a new local path. It uses **Strategy**, **Recurring**,
and **Log** tabs. The fixed example contains 12 weekly plans and 48 manual sessions;
actual results are blank. Template creation and note sync save `Guide/SHEET_GUIDE.md` inside the configured
vault notes folder (by default `Sports/Guide/SHEET_GUIDE.md`), preserving an existing guide. No customization flow is required. Give the workbook and
[SHEET_GUIDE.md](SHEET_GUIDE.md) to your own chatbot to adapt it safely.

Column colors have consistent roles: pale blue for identifiers, amber for planning
inputs, green for recorded training, and gray for formulas. The guide explains the
exact headers, ID links, exercise-name delimiters, formula caches and history rules.
Plugin-created copies start next Monday and use the local timezone. Existing files
are never overwritten. Select Strategy and Log as the sheet mappings; Recurring is
read automatically with Strategy. The older templates and formats remain supported.

In settings, choose the exact **Strategy sheet** and **Tracking sheet** tab names.
Leave either blank to disable that import; both may be blank for calendar/notes-only
use. You can rename tabs and keep other sheets in the workbook. Selected tabs still
need the column/table structure below; arbitrary column mapping is not supported.
Disabling a role retains its last imported local data and notes. A selected tab that
is missing or invalid fails the import rather than silently clearing data. With only
tracking selected, a strategy is not required and paired part references may remain
unresolved. A new tracking-only plan uses the device timezone until strategy supplies one.

Sync creates ordinary Markdown files in the configured **Notes folder**:

- `Plans.md`: starting levels, goals, weekly links, and upcoming manual sessions.
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
| 1 | 2026-10-26 | Foundation | Establish starting level | Record controlled variations | Review results before progressing | 160 |

`Week` is a unique positive program-week number. `Start` is a unique Monday date.
`Phase` and `Focus` are required; other fields may be blank. You can plan 12 weeks
or another length. Enter explicit weekly targets rather than relying on automatic
increases. Review results each week and edit the remaining plan when repeating or
adjusting a week. Weekly targets and dated session plans are separately editable;
changing a target does not silently rewrite daily sessions or shift dates.

On **Training log**, the offered template follows a simple daily layout. Put these
headers in row 1; there is no technical `Sessions` marker:

| Date | Block | Plan | Core done | Muscle-up result | HSPU result | Pistol result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | A | Muscle-up + pistol practice, then core | FALSE | | | | |

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

Dates may be spreadsheet dates or ISO text (`YYYY-MM-DD`). Daily Plan text is not
parsed into invented durations, distances, or sets. Distance fields, exercise tables,
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
Reload Obsidian after changes and enable **Sports Plugin** under
**Settings → Community plugins**.

```sh
npm run build
npm run lint
npm test
```

GitHub Actions runs the build and lint checks on pushes and pull requests.

## Manual installation

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/obsidian-sports-plugin/`, then reload Obsidian.
The existing manifest ID, `sports-plugin`, is preserved to retain plugin identity.

## Releases

Update the version with `npm version patch`, `npm version minor`, or
`npm version major`. The version script updates `manifest.json` and `versions.json`.
Push the commit and its version tag to GitHub. Tags must match the manifest version
exactly, without a `v` prefix; for example, `1.0.1`.
The release workflow builds the plugin and creates a draft release containing
`main.js`, `manifest.json`, and `styles.css`. Review and publish the draft on GitHub.

## Privacy

The prototype runs locally. External requests are disabled unless you connect Garmin. With local-file
sync enabled on desktop, it reads the one workbook path you configure outside the
vault. It does not scan other folders or modify the source workbook. Template
creation is an explicit action and refuses to overwrite existing files. Imported plan data,
sync preferences, and generated-block baselines are stored in local
plugin settings; these may travel with the vault if your sync tool includes plugin settings.
Generated notes are ordinary vault files. Source workbooks and newly created
templates stay at the configured external local path.
Local plugin settings (`data.json`), dependencies, environment files, and compiled
output are excluded from version control.

## License and attribution

Based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
The original copyright notice and 0-BSD license are retained in [LICENSE](LICENSE).

Regular weekly activities are managed in the workbook Recurring tab and imported
into the strategy note.
**Show regular activities** defaults to off in Sports settings. Enable it to include
workbook weekly activities in the dashboard and weekly
notes. Changing it refreshes generated notes from cached data. The log and plans notes
contain only explicit Training log rows; dated sessions entered there remain
visible regardless of this setting.

If you delete generated notes to start again, use **Settings → Sports Plugin →
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

On desktop, select **Settings → Sports Plugin → Connect Garmin**. Sign in with your
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
Garmin refreshes independently when workbook import fails. With both workbook sheet
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
