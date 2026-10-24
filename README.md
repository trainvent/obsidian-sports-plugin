# Sports

Plan your training in a spreadsheet. Follow it, track progress, and reflect in Obsidian.

Sports brings XLSX and ODS training plans, recurring activities, workout results,
and optional Garmin Connect imports into a dashboard and linked Markdown notes.
Built by [Trainvent](https://github.com/trainvent) for athletic training,
street workout, calisthenics, and other sports.

## Install

Sports is available in Obsidian's community plugins directory.

1. Open **Settings → Community plugins → Browse**.
2. Search for **Sports**, select **Install**, then **Enable**.
3. Open **Settings → Sports** to set up your workbook or connect Garmin.

Requires **Obsidian 1.11.4 or later** on desktop. Mobile is not supported.
Garmin integration is experimental and uses unofficial endpoints.

## What you can do

- **Plan:** connect goals, training parts, weekly targets, and dated sessions.
- **Record:** enter sets, time, rounds, added weight, and other measurements in your workbook.
- **Review:** compare plans and results, follow training trends, and write weekly reflections.
- **Combine sources:** see workbook sessions, recurring activities, and Garmin activities together.
- **Keep your notes:** browse ordinary Markdown files with space for your own commentary.

Sync flows **workbook → Obsidian**. Edit plans and results in your spreadsheet;
write reflections in Obsidian. Sports never uploads changes to your workbook.
Charts render locally without another community plugin or chart service.

## Get started

1. In **Settings → Sports**, select **Download XLSX** or **Download ODS**.
   The example starts next Monday. Adapt its goals and training to your needs.
2. Upload the file to Nextcloud or another service that provides an HTTPS download link.
3. Paste that link into **Cloud workbook link**. Keep the default sheet mappings:
   **Strategy**, **Daily**, and **Recurring**.
4. Select **Sync now**, then **Open dashboard**.
5. Record training in the workbook, recalculate and save, then sync again.

In the example, adjust the set values to what you did, clear unused sets, and
select TRUE under **Session done**. FALSE or blank leaves the prefilled targets
unrecorded. Positive Cal-Intervals rounds are recorded with Session done;
zero or blank means that circuit was not done. Leave actual kg blank until recorded.

Enable **Show regular activities** to include your Recurring schedule in the
dashboard and weekly notes. It is off by default. Recurring entries describe
plans; they never prove that an activity was completed.

Each sheet mapping is optional and accepts an exact tab name. Leave it blank to
disable that import. Garmin can be used independently by leaving all three blank.
Disabling a mapping retains previously imported data and notes.

For everyday Daily-sheet edits, you can also use [Calcrow](https://calcrow.com/),
made by Trainvent. Save changes to the cloud workbook before syncing Sports.

## Workbook and tracking guides

- [Workbook guide](Workbook.md): sheet structure, goals, schedules, scoring, loads, and safe customization.
- [Flexible tracking guide](Tracking.md): custom exercises, any number of sets, variable targets, and multiple metrics.
- Example files: [XLSX](templates/Training-example.xlsx) · [ODS](templates/Training-example.ods).

The templates include Strategy, Daily, Recurring, Library, Loads, and Scoring.
Their exercises and five set columns are examples; the importer supports custom
layouts described in the guides. To adapt a workbook with a chatbot, give it a
copy and the workbook guide. Preserve recorded history and stable session IDs.

Sports reads saved formula results and does not recalculate spreadsheets.
Recalculate and save in your spreadsheet editor before syncing. Keep Library,
Loads, and Scoring tab names: they are discovered automatically.
A workbook guide is copied into your notes folder; existing guide edits are preserved.
The tracking guide is also available from the dashboard and command palette.

## Your notes

The default notes folder is `Sports/`. Files are created as their source data becomes available.

| Path | Contents |
| --- | --- |
| `Overview.md` | Starting page with today, this week, and navigation |
| `Stats.md` | Source totals and training trends |
| `Structure/Plans.md` | Goals, weekly progression, and upcoming sessions |
| `Structure/Strategy.md` | Program structure and recurring schedule |
| `Structure/Calendar.md` | Upcoming workbook sessions, recurring activities, and optional Coach workouts |
| `Analytics/Log.md` | Manual results and Garmin activities, grouped by date |
| `Analytics/Sheet.md` | Planned intensity, performance, and felt-effort trends |
| `Analytics/Smartwatch.md` | Garmin volume, running, and swimming graphs |
| `Days/_Index.md` and `Days/YYYY-MM-DD.md` | Day index, session details, sets, and reflections |
| `Weeks/YYYY-MM-DD.md` | Weekly plans, results, and review |
| `Goals/<goal_id>.md` | Goal targets, mapped results, matching activities, and reviews |
| `Routines/` | Routine explanations, exercises, and progressions |
| `Guide/` | Workbook and tracking guides |

Weekly notes cover the current week, imported sessions, and Week plans.
Day notes cover today and earlier dates with workbook or Garmin entries.
Goal categories distinguish aspiration and maintenance; either can use workbook
results and Garmin activities. Configure their source mappings in Strategy.

Goal notes keep category and source mappings in properties. Routines link goals
through **targets**. Day notes have **date** and a linked **week**; weekly notes
have **week_start**, **week_end**, **program_week**, and **phase**. Sync updates
these workbook-derived properties and preserves unrelated custom properties.
Benchmarks, training details, results, and reflections stay in the body.
Overview provides general navigation. Shared `sports/planning`, `sports/goals`,
`sports/training`, and `sports/analytics` tags group related pages; running and
swimming notes also share sport tags. Custom tags are preserved. Other notes keep
links within their relevant content.

### Add today to another note

Paste this fenced block into your dashboard note:

````markdown
```sports-today
```
````

It shows today's sessions, Garmin activities, enabled recurring activities, and
a link to the weekly note in Reading view or Live Preview.

## Sync and cloud links

Use an HTTPS link to the XLSX or ODS file itself. Nextcloud file-share links such
as `https://cloud.example/s/SHARE_TOKEN` work; Sports adds `/download` automatically.
The link must allow downloads without a login or password. Folder shares,
spreadsheet editor URLs, local paths, and encrypted workbooks are unsupported.
Downloads are limited to **5 MB** and **30 seconds**, with redirects restricted
to the same HTTPS server.

Startup sync is enabled and the default interval is ten minutes. Choose five,
ten, or fifteen minutes, one hour, or **Manual only** in settings. Startup sync
has its own toggle. Automatic sync runs while Obsidian is open; closed apps and
suspension stop or delay it. Garmin automatic refresh runs at most hourly.
Failed downloads or invalid imports retain the previous dataset.

## Notes and recovery

Sports refreshes only its `sports:begin` / `sports:end` generated sections.
Write your own text outside those markers. If a generated section has been edited
or its markers are damaged, Sports reports a conflict and leaves that note alone.
Move personal changes outside the section and restore the previous generated
content before refreshing. Other notes can still update when one conflicts.

Keep managed filenames stable. Deleted notes are not silently recreated: use
**Recreate missing notes** in settings or the command palette. Use **Generate
notes from imported data** to refresh from the cache without downloading again.

**Clear cached data** removes imported workbook and Garmin data, note baselines,
and errors while keeping settings and note files. On the next sync, existing
target notes are backed up under `Backups/<timestamp>/` in your notes folder before
rebuilding generated sections. Personal text outside the markers is preserved.
Recovery remembers notes that return later with Garmin data, even after the
workbook has already refreshed. A reset cannot recover results that were never
saved in the workbook.

## Training charts

Exercise comparisons show explicit targets and recorded results, with each unit
kept separate. Blank results remain missing; zero remains a recorded value.

The example's Scoring sheet supplies planned intensity (0–10), target attainment
as performance (%), and coverage. Optional **Effort rating** (1–5) records how
hard the session felt. These are separate measurements. The workbook guide explains
the chart scales and calculation inputs in [Workbook.md](Workbook.md#scoring-and-the-analytics-folder).

Stats keeps workbook and Garmin totals separate. Smartwatch charts show weekly
recorded minutes, running pace, swimming pace, heart rate, and available zone data.
Garmin activities never complete a manual session automatically.

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

Activity ID, local date/time, name, type, duration, distance, average heart
rate and heart-rate zone summaries are cached in the vault's plugin data and shown in **Log**, weekly notes and the
dashboard. No GPS routes or complete account responses are retained. Activities use
Garmin's local start time; GMT-only records use the plan's timezone, or your local
timezone without a plan. Garmin records never mark manual sessions complete.

Each successful refresh replaces the selected date range, so activity edits and
deletions do not create duplicates. On failure the previous snapshot remains visible
with a warning. **Disconnect** clears the saved tokens and stops Garmin requests;
cached activities remain available. **Clear cached data** removes the imported
activity cache while keeping connection settings. Generated notes and reflections
keep their existing edit protection.

### Optional Garmin Coach plans

Enable **Show Garmin Coach plans** to include published adaptive Coach workout
summaries for the next 28 days in Plans and Calendar. This is off by default and
still needs live-account verification. Full workout steps, self-scheduled workouts,
and static training plans are excluded. Check Garmin Connect for the current prescription.
Failed refreshes retain cached summaries with a warning. Turning the setting off
stops Coach requests; disconnecting stops all Garmin requests.

## Current limits

- Desktop only, with one active workbook plan. Changing its plan ID requires clearing the cache.
- No workbook write-back, watch workout uploads, external calendar sync, or automatic coaching.
- Sheet names are configurable; arbitrary column mapping and import previews are not available.
- Recurring activities use a weekly schedule; per-occurrence edits and schedule-timezone conversion are not implemented.
- Completed sessions and linked part versions are protected. Removed completed sessions remain cached; removed unfinished rows leave the active plan.
- Generated-note conflicts require manual recovery; there is no conflict-resolution interface.

See [the roadmap](STRATEGY.md) for development direction.

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

## Development and releases

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

The watcher writes `main.js` at the plugin root. Reload Sports in Obsidian after
changes. Run the checks before a release:

```sh
npm run build
npm run lint
npm test
```

For manual installation, copy `main.js`, `manifest.json`, and `styles.css` from a
[GitHub release](https://github.com/trainvent/obsidian-sports-plugin/releases)
to `<vault>/.obsidian/plugins/sports/`, then reload Obsidian and enable Sports.
Do not commit generated bundles or local plugin data.

Use `npm version patch`, `npm version minor`, or `npm version major` to update
package.json, manifest.json, and versions.json. Push the commit and version tag.
Tags must exactly match the manifest version without a `v` prefix. The release
workflow builds a draft release with the plugin files and both example workbooks;
review and publish it on GitHub.

## Help and support

[Report an issue](https://github.com/trainvent/obsidian-sports-plugin/issues) with
your Obsidian and Sports versions, the error, and steps to reproduce it. Remove
private share links, credentials, and personal training data from attachments.
You can also use [Trainvent support](https://next.trainvent.com/de/software-support/)
or [sponsor development](https://github.com/sponsors/trainvent).
