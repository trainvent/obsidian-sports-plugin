# Obsidian Sports Plugin

An Obsidian plugin developed by [Trainvent](https://github.com/trainvent).

## Status

An offline TypeScript prototype is implemented: optional strategy/tracking XLSX import, a weekly dashboard,
weekly recurring activities, manual/interval sync, and protected Markdown generation.
Cloud sources and tracker integrations are planned in [STRATEGY.md](STRATEGY.md).
Obsidian 1.7.2 or later is required. Local workbook reading and template creation
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
5. Select **Add recurring activity** to schedule a weekly sport. Select **Open weekly
   note** to create or refresh that week's note.

**Settings → Sports Plugin** offers an absolute workbook path (or `~/Sports/...`), notes folder, startup sync,
and intervals of five minutes, fifteen minutes, or one hour. **Manual only** is the
default. Scheduling runs inside Obsidian; closed apps and mobile suspension stop or
delay it. No external scheduler or Python installation is required.

Generated notes default to `Sports/Strategy.md` and `Sports/Weeks/YYYY-MM-DD.md`
inside the user's vault. Sync refreshes the strategy and previously generated weekly
notes. Adding/removing a recurring activity is reflected immediately in the dashboard;
reopen its weekly note or sync to refresh the Markdown overview.

Local sources use desktop filesystem access, so local paths are device-specific.
A previous vault-relative setting must be replaced with an absolute external path.
The plugin does not move or delete your existing workbook. Missing files and failed
reads retain the last imported plan. Choose another path before creating a second
template. Cloud sources will later provide an alternative for mobile devices.

## Workbook format (prototype schema 1)

Download the reusable [Sports template](templates/Sports-template.xlsx), or create it
from Sports settings. It includes example strategy and tracking sheets.

In settings, choose the exact **Strategy sheet** and **Tracking sheet** tab names.
Leave either blank to disable that import; both may be blank for calendar/notes-only
use. You can rename tabs and keep other sheets in the workbook. Selected tabs still
need the column/table structure below; arbitrary column mapping is not supported.
Disabling a role retains its last imported local data and notes. A selected tab that
is missing or invalid fails the import rather than silently clearing data. With only
tracking selected, a strategy is not required and paired part references may remain
unresolved. A new tracking-only plan uses the device timezone until strategy supplies one.

Select **Open training log** in the Sports dashboard (or command palette) to view
the complete schedule from the tracking sheet, including plans, completion checks,
results, and notes. Sync refreshes `Training log.md` in the configured notes folder.
Commentary outside its generated section is preserved. The dashboard also shows
these entries in their corresponding weeks.

Each table begins
with its name alone in column A, followed immediately by a header row and data rows.
Separate tables with a blank row. These are simple labeled ranges, not Excel named
tables; no formulas or AI interpretation are needed. The example command generates
this layout with three goals and training parts A/B.

On **Strategy**, include:

| Table label | Headers |
| --- | --- |
| `Plan` | `schema_version`, `plan_id`, `plan_name`, `timezone` |
| `Goals` | `goal_id`, `title`, `benchmark` |
| `Parts` | `part_id`, `version`, `title`, `prescription` |
| `PartGoals` | `part_id`, `version`, `goal_id` |

`Plan` contains exactly one row. Set `schema_version` to `1` and use an IANA timezone,
such as `Europe/Berlin`. Each `PartGoals` row links one part version to one goal.

On **Training log**, the offered template follows a simple daily layout. Put these
headers in row 1; there is no technical `Sessions` marker:

| Date | Block | Plan | Core done | Muscle-up result | HSPU result | Pistol result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-19 | A | Muscle-up + pistol practice, then core | FALSE | | | | |

Use one row per day, with block `A`, `B`, `Technique`, or `Empty` in the example.
`Block` links to a Strategy part's `part_id`; you may define your own block names.
`Plan` stays readable free text and is shown in Obsidian without AI interpretation.
Use `Empty` or an empty block for a day without a manual prescription.

- Required columns: `Date`, `Block`, `Plan`.
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
No manual log. This records intent only; tracker integration is still pending and
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

The prototype runs locally and makes no external service calls. With local-file
sync enabled on desktop, it reads the one workbook path you configure outside the
vault. It does not scan other folders or modify the source workbook. Template
creation is an explicit action and refuses to overwrite existing files. Imported plan data,
recurring activities, sync preferences, and generated-block baselines are stored in local
plugin settings; these may travel with the vault if your sync tool includes plugin settings.
Generated notes are ordinary vault files. Source workbooks and newly created
templates stay at the configured external local path.
Local plugin settings (`data.json`), dependencies, environment files, and compiled
output are excluded from version control.

## License and attribution

Based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
The original copyright notice and 0-BSD license are retained in [LICENSE](LICENSE).
