# Obsidian Sports Plugin

An Obsidian plugin developed by [Trainvent](https://github.com/trainvent).

## Status

An offline TypeScript prototype is implemented: two-sheet XLSX import, a weekly dashboard,
weekly recurring activities, manual/interval sync, and protected Markdown generation.
Cloud sources and tracker integrations are planned in [STRATEGY.md](STRATEGY.md).
Obsidian 1.7.2 or later is required. Mobile runtime behavior is not yet verified.

## Try the prototype

1. Build the plugin, reload Obsidian, and enable **Sports Plugin**.
2. Run **Sports Plugin: Create example workbook** from the command palette. This
   creates a fictional two-sheet workbook inside the vault and selects it in settings.
3. Run **Sports Plugin: Open dashboard**, then select **Sync now**.
4. Open the workbook with your spreadsheet editor to change plans or record results.
   Save it back to the selected path inside the vault, then sync again.
5. Select **Add recurring activity** to schedule a weekly sport. Select **Open weekly
   note** to create or refresh that week's note.

**Settings → Sports Plugin** offers the workbook path, notes folder, startup sync,
and intervals of five minutes, fifteen minutes, or one hour. **Manual only** is the
default. Scheduling runs inside Obsidian; closed apps and mobile suspension stop or
delay it. No external scheduler or Python installation is required.

Generated notes default to `Sports/Strategy.md` and `Sports/Weeks/YYYY-MM-DD.md`
inside the user's vault. Sync refreshes the strategy and previously generated weekly
notes. Adding/removing a recurring activity is reflected immediately in the dashboard;
reopen its weekly note or sync to refresh the Markdown overview.

## Workbook format (prototype schema 1)

Use exactly two sheets named **Strategy** and **Training log**. Each table begins
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

On **Training log**, use the table label `Sessions`:

| Required headers | Optional headers |
| --- | --- |
| `session_id`, `date`, `sport`, `title` | `part_id`, `part_version`, `planned_minutes`, `actual_minutes`, `result`, `status`, `notes` |

Use stable IDs, ISO dates (`YYYY-MM-DD`), and nonnegative numeric minutes. A part
reference needs both its ID and version. Allowed statuses are `planned`, `completed`,
`skipped`, and `cancelled`; an empty status defaults to `planned`. Empty actual fields
stay unknown. Use separate rows for multiple sessions on one day.

The prototype reads the documented columns only. Distance, exercise tables, progression
rules, import previews, custom intervals, and per-occurrence recurrence edits remain
planned. Use the part prescription for exercise details for now. Date display and weekly
navigation use the device's local calendar; schedule-timezone conversion is not yet implemented.
Only one plan is active; changing to a different plan ID is rejected. Completed sessions
cannot change dates or part references, and versions used by completed sessions must
remain unchanged. Removed completed rows are retained locally; removed uncompleted
rows currently disappear from the active plan.

## Markdown ownership and safety

Edit structured plans/results in the workbook and reflections in Markdown. The plugin
updates only its `sports:begin` / `sports:end` blocks and preserves surrounding prose.
If a generated block changes or loses its markers, refresh reports a conflict and leaves
that note untouched. Restore the previous generated block after moving your edits outside
it to resume updates. Renamed/deleted managed notes are not automatically rediscovered;
keep their generated paths stable in this prototype. A deleted generated note is not
silently recreated.

Imports validate both sheets before replacing cached plan data. Invalid workbooks retain
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

The prototype runs locally and makes no external service calls. Imported plan data,
recurring activities, sync preferences, and generated-block baselines are stored in local
plugin settings; these may travel with the vault if your sync tool includes plugin settings.
Generated notes and example workbooks are ordinary vault files.
Local plugin settings (`data.json`), dependencies, environment files, and compiled
output are excluded from version control.

## License and attribution

Based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
The original copyright notice and 0-BSD license are retained in [LICENSE](LICENSE).
