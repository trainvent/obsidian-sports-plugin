# Sports — product strategy and implementation checklist

Status: proposal for discussion · 2026-10-20

## Product goal

Build an Obsidian community plugin that connects a person's training plan, recurring sports, recorded activities, and weekly reflections. A user should be able to answer: What is planned? What did I actually do? What changed? What should I focus on next week?

Use the existing personal Fitness workflow as a reference: connected overview, weekly plans, exercise guides, goals, manual results, tracker activities, and preserved reflections. Generalize these patterns for different sports and vault structures. Do not embed personal paths, accounts, training prescriptions, or data in the public plugin.

## Implementation status

An initial offline prototype now implements TypeScript-only workbook import, a weekly dashboard,
manual/fixed-interval sync, weekly recurring events, and protected strategy/weekly Markdown blocks.
It includes an example-workbook command. See README.md for the exact supported schema and
current limitations. The checklist below remains the target design; full phase acceptance,
cloud/tracker connections, import previews, and robust multi-file recovery are not complete.

## Proposed defaults to agree on

- [ ] Use a local-first design: manual planning, calendar, notes, and cached dashboards work without a cloud account.
- [ ] Make XLSX the first supported external training-plan format, with a documented template and import preview.
- [ ] Offer a template with **Strategy** and **Training log**, but make both roles optional and let users select their own sheet names. Use selected sheets as the source for strategy, scheduled sessions, and workbook-entered results. Sync workbook → plugin → dashboard and generated Markdown blocks; keep personal reflections editable in Obsidian.
- [ ] Store manual calendar events, completion decisions, and reflections locally in the vault. Keep them separate from imported plan records.
- [ ] Support a workbook inside the vault first, then WebDAV/Nextcloud, then Google Drive. Users select one authoritative source per plan.
- [ ] Make Garmin the first tracker feasibility investigation; provide activity-file import so core features do not depend on API approval.
- [ ] Treat direct tracker connections as optional adapters, with clear supported-provider status rather than a promise to support every device.
- [ ] Target desktop first while keeping core modules browser-compatible; verify mobile authentication and storage before advertising mobile support.
- [x] Fix sync direction permanently: XLSX → plugin → Obsidian Markdown/dashboard. Never write plan, tracking, or Markdown changes back to XLSX. Creating a new template is a separate explicit action, not synchronization.
- [ ] Exclude workout upload to watches, external calendar sync, coaching recommendations, and a hosted Sports account from the first release.

## 1. Foundation and shared data model

- [ ] Replace sample UI and document-click notices with Sports commands, settings, and a dashboard entry point. Preserve existing plugin identity.
- [ ] Define separate records for goals, versioned training parts, training plans, planned sessions, exercise prescriptions, recurring series, calendar occurrences, recorded activities, manual results, activity-to-session links, and weekly reviews.
- [ ] Give every record a stable ID and source provenance. Use provider + account + external ID for imported activities and plan + session ID for workbook rows.
- [ ] Keep planned targets and actual measurements separate; a changed plan must not rewrite completed results.
- [ ] Store timestamps with offsets and an explicit IANA timezone for schedules. Support configurable week starts and distinguish program week numbers from calendar week numbers.
- [ ] Normalize duration, distance, pace, load, and display units; preserve source units and represent missing measurements as unknown rather than zero.
- [ ] Define versioned schemas and migrations before users accumulate data.
- [ ] Use readable Markdown/frontmatter for durable user-owned records, with a rebuildable index for views. Prototype storage size and indexing before fixing the final layout.
- [ ] Keep lifecycle registration in `main.ts`; separate models, storage, workbook parsing, sync, providers, calendar, dashboard, and weekly-note rendering.

## 2. Training-plan workbook contract

The offered workbook template has two sheets: **Strategy** describes why and how to train; **Training log** keeps daily planning and recording simple. Neither role is mandatory. Users choose the exact sheet name for each role independently, or leave it unset. Support strategy-only, tracking-only, both, and neither (calendar/notes only). Extra sheets are allowed and ignored. Selected sheets use explicitly labeled, header-based tables so parsing needs no AI. Multiple sessions per day are separate rows; future rows are planned sessions and completed rows also contain actual results. Recurring club/course events can still be managed in the plugin.

| Sheet | Named table | Content |
| --- | --- | --- |
| `Strategy` | `Plan` | One metadata row: `schema_version`, `plan_id`, `plan_name`, `timezone`; optional start date and week start |
| `Strategy` | `Goals` | `goal_id`, title, and optional benchmark/measurement unit |
| `Strategy` | `Parts` | `part_id`, `version`, title, prescription, optional phase and progression rules |
| `Strategy` | `PartGoals` | One relationship per row: `part_id`, `version`, `goal_id` |
| `Strategy` | `Exercises` | Optional detail: `exercise_id`, `part_id`, `version`, order, name, sets/reps/load/duration/rest and guide link |
| `Training log` | Daily log (default) | Required: `Date`, `Block`, `Plan`; optional `Core done`, goal-specific `… result` columns and `Notes`. Links Block to strategy parts without exposing IDs in daily use. |
| `Training log` | `Sessions` (technical compatibility) | Required: `session_id`, `date`, `sport`, `title`. Optional: `part_id`, `part_version`, start time, planned duration/distance/target, actual duration/distance/result, status, notes, program week and optional-session flag |

- [x] Offer a daily tracking sheet modeled on the existing simple log: Date, Block, readable Plan, Core done, separate skill results, and Notes. Keep future plans and entered results on the same row.
- [x] Preserve custom result/check fields independently. A checked core flag is partial progress, not whole-session completion. Do not infer durations, goals achieved, or exercise results from prose.
- [x] Support the daily layout directly, with no Sessions marker or mandatory technical session-ID column. Keep technical Sessions imports compatible.
- [ ] Provide clearly separated tables on Strategy with readable headings; keep Training log as one filterable daily table. The template supplies technical IDs and column explanations.
- [ ] Link goals → training parts → scheduled sessions → results through IDs. A part may support several goals, and a goal may be supported by several parts.
- [ ] Use a fictional example with three goals and two parts: A supports muscle-up + pistol; B supports handstand push-up + pistol. A daily row only needs a short part reference to expose its detailed prescription.
- [ ] Allow sessions without a training-part reference, such as a one-off easy run. If a reference is supplied, require both part ID and version and validate the relationship.
- [ ] Keep planned and actual columns separate. Blank actual fields mean unrecorded, not zero or automatically completed; define allowed statuses explicitly.
- [ ] Make part versions immutable once used by completed sessions. Create a new version for changed prescriptions; retain prior versions and snapshot the resolved prescription with historical results.
- [ ] Allow a daily planned target to override the part default explicitly, while preserving both the original reference and the effective target.
- [ ] Track goal exposure from linked sessions separately from goal achievement, which requires an explicit benchmark result or user confirmation.
- [ ] Offer a setup/validation form that explains goals and parts and can prepare a template; do not require AI to infer structure from prose.
- [ ] Publish exact column names, types, date/time formats, units, boolean/status values, table names, and fictional examples as the versioned contract.
- [ ] Require stable IDs that survive row reordering; allow dates to change without creating duplicate sessions.
- [ ] Provide a minimal workbook and a multisport example with strength, running, swimming, rest days, and optional sessions using fictional data.
- [ ] Support notes and prescription text without requiring advanced spreadsheet formulas or macros.
- [ ] Validate required sheets, duplicate IDs, unknown goal/part/version references, negative values, dates, and units; show sheet/row/column errors before applying an import.
- [ ] Define treatment of formulas: never execute workbook code; use valid cached values only, with an actionable error when required values are unavailable.
- [ ] Handle Excel date systems, text dates, empty cells, localized numbers, and compatible exports from Excel, LibreOffice, and Nextcloud editors.
- [ ] Apply file-size and decompression limits; reject malformed or unsupported workbooks without changing the current plan.
- [ ] Preview additions, changes, and removed rows. Preserve linked history when a session disappears; archive its plan record rather than deleting results or notes.
- [ ] Apply a validated import atomically and retain the last working snapshot for recovery.
- [ ] Consider a mapping wizard for arbitrary workbooks after the standard format works reliably.

### Core circuit used in the example strategy

- [x] Include a reusable **Core circuit** training part after Skills A and Skills B.
- [x] Prescribe **5 rounds × 4 exercises**, with **30 seconds work + 20 seconds rest** per exercise, in this order: pull-ups → push-ups → weighted squats → upside-down hanging shoulder/ab work. Repeat the circuit five times.
- [x] State the exact duration: **16 minutes 40 seconds including the final rest** (5 × 4 × 50 seconds); the informal “16-minute core workout” refers to this circuit.
- [x] Keep **Core done** as its own tracking field, separate from skill results and whole-session completion.

## 3. Workbook connectivity and dashboard sync

- [ ] Implement a common source interface: select source, fetch content/version, validate, preview changes, apply, and report status.
- [ ] Local source: select a file within the vault, watch changes with debounce, and support manual refresh.
- [ ] WebDAV source: configure server and workbook path; support generic WebDAV credentials and evaluate Nextcloud browser authorization as an additional convenience.
- [ ] Google Drive source: select a specific XLSX file through authorized file access; validate OAuth setup, scopes, verification requirements, and desktop/mobile redirects in a prototype.
- [ ] Treat native Google Sheets as a separate later adapter or explicit XLSX export path; do not silently assume it behaves like a stored XLSX file.
- [ ] Use version metadata such as ETags where supported to skip unchanged content. Never upload workbook changes during read-only sync.
- [ ] Bring sync scheduling into the plugin, replacing the external timer used in the personal workflow; no separate background service is required.
- [ ] Add a **Sync now** dashboard button and command-palette command to refresh all connected sources, plus a per-source action in connection settings.
- [ ] Show progress and a success, unchanged, or failure result for each source. Disable duplicate requests while that source is syncing; preserve successful source updates when another source fails.
- [ ] Add per-source automatic-sync settings: **Manual only**, **Every 5 minutes**, **Every 15 minutes**, **Every hour**, and a validated custom interval. Respect provider minimum intervals and rate limits; manual sync must also respect retry delays.
- [ ] Propose workbook sync every five minutes and tracker sync hourly when the user enables automatic sync; keep external connections opt-in and let users change these defaults.
- [ ] Persist interval preferences, reschedule immediately when settings change, prevent overlapping requests, and back off after failures. Show the next eligible sync time and any retry delay.
- [ ] Offer **Sync on startup** and **Sync on resume** options. After suspension, run at most one overdue sync per source rather than replaying missed intervals.
- [ ] Explain that automatic sync runs only while Obsidian is open and active enough to run scheduled work; closing Obsidian stops it, and mobile background suspension can delay it. Keep the last successful sync timestamp visible.
- [ ] Keep the last successful dataset on offline, authentication, or validation failure. Show last attempt, last successful sync, source, and stale-data warnings.
- [ ] Refresh dashboard and generated note blocks from the same validated snapshot so views agree.
- [ ] Make retries idempotent, cancel requests on unload, and distinguish a confirmed source deletion from a failed or incomplete fetch.
- [x] Treat all connected workbook sources as read-only. Markdown edits and local overrides are never uploaded to XLSX; do not implement a publish-to-workbook action.

## 4. Garmin and other trackers

- [ ] Run an early Garmin feasibility spike covering official API eligibility/approval, authentication, available activity fields, usage terms, attribution, costs, and any backend requirements.
- [ ] Record a go/no-go decision for a distributable direct Garmin connector before promising it in release scope. The personal Python integration is a reference, not a dependency to copy into the public plugin.
- [ ] Evaluate any unofficial connector separately for reliability, account-security implications, licensing, and maintenance; do not make users share Garmin passwords with Sports by default.
- [ ] Prototype local activity-file import, initially choosing FIT or TCX after evaluating parser size, licensing, and field coverage; add GPX later if useful.
- [ ] Define a tracker adapter interface with capability flags, account connection/disconnection, incremental fetch, bounded history import, and connection health.
- [ ] Import only needed fields initially: sport, title, start time, elapsed/moving duration where available, distance, and average heart rate. GPS routes and broader health data require a separate explicit decision.
- [ ] Upsert repeated imports by stable source identity; define correction and deletion handling per provider's actual capabilities.
- [ ] Preserve source provenance and detect likely duplicates across file imports and multiple providers; let users resolve ambiguity.
- [ ] Suggest plan matches using sport, time, and duration; allow users to confirm, unlink, or link multiple activities to a session.
- [ ] Never mark a strength prescription or recurring course complete solely because an activity occurs on the same day.
- [ ] Choose the next provider based on user demand and official API feasibility, for example Strava, Polar, or Suunto; evaluate Apple Health and Health Connect as separate platform-specific projects.
- [ ] Keep API secrets out of the distributed bundle. If a provider needs a backend, document hosting, data handling, cost, and ongoing ownership before implementation.

## 5. Calendar and manually scheduled sports

- [ ] Add day/week views combining workbook sessions, recurring activities, and actual tracker activities, with distinct planned/completed indicators.
- [ ] Add a quick action for one-off or repeating events: title, sport, weekday(s), start time, timezone, duration, location, optional notes, and start/end dates.
- [ ] Support examples such as weekly swimming courses, football practice, and every-second-week club training without spreadsheet editing.
- [ ] Support skip/cancel, reschedule, and edit-this-occurrence versus edit-future-occurrences actions; preserve completed history.
- [ ] Use stable series and occurrence IDs so schedule edits and repeated refreshes do not produce duplicates.
- [ ] Handle daylight-saving transitions, overnight activities, holidays/exclusions, and events without a fixed start time explicitly.
- [ ] Let users mark an event completed, skipped, or cancelled and optionally attach a recorded activity and session note.
- [ ] Warn about time overlaps without blocking intentional combinations or double-counting linked recorded activities in actual totals.
- [ ] Keep this calendar inside Sports initially; evaluate ICS export and external calendar integration later.

## 6. Connected overview

- [ ] Build a dashboard with today, this week, upcoming sessions, recent activities, and a clear connection/sync status area.
- [ ] Compare planned versus completed duration and distance, broken down by sport; define optional-session and skipped-session treatment visibly.
- [ ] Link each item to its plan source, activity details, exercise guide, and relevant weekly note where available.
- [ ] Provide history and future-plan views equivalent to the personal complete-log and complete-plans workflow.
- [ ] Add filters for sport, plan, date range, and status, with configurable units and timezone.
- [ ] Show goals and training parts from Strategy with linked notes, planned/completed exposure, and explicit benchmark results; do not infer achievement from attendance.
- [ ] Offer a dashboard view plus embeddable note blocks; avoid a required dependency on Dataview or another community plugin.
- [ ] Include useful empty, loading, offline, disconnected, and validation-error states; make the next action clear.
- [ ] Verify keyboard access, readable contrast, narrow layouts, and performance with realistic history sizes.

## 7. Weekly notes and reflection

- [ ] Add an idempotent **Create or open weekly note** command with configurable folder, filename pattern, week start, and template.
- [ ] Include week dates, optional program week/phase, planned sessions, actual activities, totals, and links back to the dashboard and guides.
- [ ] Preserve the personal workflow's reflection prompts: what improved, recovery/comfort, what to adjust, and next week's focus.
- [ ] Clearly separate generated blocks from user-authored text using stable markers. Update only plugin-owned blocks.
- [ ] Preserve reflections, checkboxes, and custom sections during every refresh; treat missing/edited markers as a conflict requiring recovery rather than replacing the note.
- [ ] Use safe note updates and detect changes during generation. Handle renamed notes and avoid duplicate creation across devices.
- [ ] Define week-boundary behavior, including year transitions and activities recorded in another timezone.
- [ ] Allow template customization and optional links to an existing weekly-note system without requiring another plugin.

### Workbook and Markdown synchronization contract

Start with a clear ownership rule rather than automatic two-way editing of prose. Both sheets feed Markdown, but each field has one authoritative editor. This extends the existing generated-markers approach and preserves normal Obsidian writing.

| Data | Authoritative editor | Markdown representation |
| --- | --- | --- |
| Goals, parts, prescriptions, progression | `Strategy` sheet | Generated strategy/goal/part blocks, with editable commentary outside them |
| Daily schedule and workbook-entered results | `Training log` sheet | Generated session details, weekly tables, and history blocks |
| Tracker measurements | Connected tracker or imported activity | Linked actual-activity blocks, separate from workbook results |
| Plugin-created recurring events and manual overrides | Sports controls backed by local records | Calendar and generated weekly blocks |
| Reflections, observations, personal prose | Markdown files | User-owned sections preserved verbatim |

- [ ] Propose a configurable vault folder with `Strategy.md`, `Parts/`, `Sessions/`, and `Weeks/`; create detailed session/part notes on demand to avoid unnecessary files. The dashboard can remain a live plugin view.
- [ ] Identify managed notes with namespaced frontmatter IDs, including plan/session/part/version or week identity, rather than filenames alone. Keep links working when users rename files.
- [ ] Give each generated block a stable identity, for example `<!-- sports:begin strategy:plan-01 -->` and its matching end marker. Keep reflections outside generated blocks.
- [ ] On **Sync now** or an interval: fetch workbook → validate selected sheets together → resolve available references → stage a new dataset → update affected Markdown blocks and dashboard from that dataset.
- [ ] Reject the workbook update if a selected sheet is missing or invalid. A disabled role is not an error and retains its last imported local data; it does not erase history or generated Markdown. Validate part references against strategy when strategy is selected. Tracking-only imports can keep paired part/version references unresolved until a strategy is supplied.
- [ ] Compare against the last generated block content before replacing it. If the user edited it, preserve the edit and show a conflict with options to keep it as commentary or restore the workbook rendering. Do not silently overwrite.
- [ ] Persist a pending-generation journal and recover interrupted multi-file updates. Publish the new dataset revision once staged, label any notes still on an older revision, and retry their updates safely; do not promise an atomic transaction across Markdown files.
- [ ] Watch user-owned notes to refresh links and indexes without uploading their prose or triggering a sync loop. Identical inputs produce no file changes.
- [ ] Import workbook results and retain local completion overrides separately. If they disagree, show both and ask for an explicit resolution rather than choosing by modification time.
- [ ] Preserve tracker measurements alongside manual results, with visible provenance; let users choose the displayed actual value without erasing either source or counting the same workout twice.
- [ ] Archive removed workbook sessions and retain history/reflections; never delete a Markdown note merely because its source row disappeared. Preserve deleted-note intent until the user requests regeneration.
- [ ] Provide **Open source workbook**, **Refresh generated sections**, and a per-note sync/conflict indicator so ownership is visible.
- [ ] Acceptance: changing a part updates linked future-session and weekly blocks; past completed prescriptions remain unchanged. Recording a result in Training log updates session/history blocks while reflections remain byte-for-byte intact.
- [ ] Acceptance: row reorder, renamed notes, repeated refreshes, manually edited generated blocks, and interruption midway through note writes cause neither duplicate records nor lost prose.
- [x] Keep the synchronization strictly one-way for all releases: edit structured source data in XLSX; edit personal prose in Markdown. Detect generated-block edits locally and never convert them into workbook changes.

## 8. Privacy, security, and operational behavior

- [ ] Make external connections explicit opt-ins and disclose what data each connection reads or sends. Never upload vault notes as part of tracker or workbook sync.
- [ ] Investigate Obsidian-supported secret storage and mobile behavior; keep credentials out of Markdown, exported data, logs, and ordinary syncable settings. Document any remaining storage limitations.
- [ ] Use HTTPS by default and provide disconnect/revoke guidance for each provider.
- [ ] Offer separate controls to disconnect a source, remove its cached data, or delete imported records; preserve user notes unless explicitly selected for deletion.
- [ ] Keep caches bounded and logs redacted. Do not add telemetry by default.
- [ ] Avoid Python, system timers, desktop sync clients, or access outside the vault as runtime requirements.
- [ ] Defer parsing and history loading until needed; index incrementally and clean up all listeners, timers, and network work on unload.

## 9. Delivery sequence and acceptance gates

### Phase 0 — agree on contracts and feasibility

- [ ] Confirm defaults, workbook schema, local storage ownership, recurrence behavior, and dashboard priorities together.
- [ ] Complete Garmin and Google authentication feasibility spikes and document blockers and fallback paths.
- [ ] Choose and review parser dependencies, licenses, bundle sizes, and mobile constraints.
- [ ] Gate: agree on an achievable first release and clearly label integrations that depend on external approval.

### Phase 1 — useful offline prototype

- [ ] Implement validated local XLSX import, manual recurring events, a weekly calendar, dashboard, and weekly-note generation.
- [ ] Gate: import a fictional multisport plan, add a swim course and football practice, record completion, and generate a linked weekly note without an account.
- [ ] Gate: reimport changed dates and reordered rows without duplicates; invalid input leaves the previous dashboard intact; regenerating a note preserves reflections.

### Phase 2 — connected workbook

- [ ] Add WebDAV/Nextcloud sync, cached operation, retry/status UI, and then Google Drive once its authentication path is proven.
- [ ] Gate: a remote workbook edit appears after refresh; offline/authentication failures retain the last valid plan; recurring events and notes survive source changes.
- [ ] Gate: **Sync now** works with automatic sync disabled; interval changes take effect without reload; overlapping clicks, rate limits, app suspension, and unload do not create duplicate jobs or burst requests.

### Phase 3 — recorded activities

- [ ] Add activity-file import and matching, then Garmin direct connectivity if approved and technically viable.
- [ ] Gate: repeated imports stay duplicate-free; corrected activities update; uncertain matches need review; recorded activity never silently overwrites a manual result.
- [ ] Publish a provider support matrix and add one additional provider after the adapter design has been exercised.

### Phase 4 — community release

- [ ] Test parser edge cases, partial sync failures, recurrence exceptions, daylight-saving changes, note conflicts, migrations, and unload/reload behavior.
- [ ] Run build and lint checks; manually verify the complete flow in a clean vault and on each advertised platform.
- [ ] Document setup, workbook contract, sync direction, provider limitations, privacy, recovery, and troubleshooting; ship fictional examples only.
- [ ] Complete Obsidian community release requirements and attach the required release assets with matching version tags.

## Open decisions for our next discussion

- [ ] Apply the agreed ownership model: Strategy and Training log are edited in XLSX; reflections and local event overrides stay in Obsidian. Workbook write-back is excluded permanently.
- [ ] Decide whether WebDAV should be the first cloud connector, followed by Google Drive, as proposed.
- [ ] Prioritize the next tracker after Garmin and whether activity-file import is an acceptable interim Garmin path.
- [ ] Choose a compact dashboard versus a calendar-first landing view.
- [ ] Confirm whether first release must include mobile, and what limitations would be acceptable.

## References and boundaries

The existing Fitness notes were reviewed as behavioral references, including the dashboard, connections guide, and a weekly note. No personal training data or credentials are reproduced here. This is a product plan; unchecked items are proposed work, not implemented features.

Official integration references checked for this proposal:

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/) and [program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/) — investigate access and approval before committing to direct sync.
- [Google Drive download/export guide](https://developers.google.com/workspace/drive/api/guides/manage-downloads) — distinguishes stored workbook downloads from Google Workspace exports.
- [Google API spreadsheet scopes](https://developers.google.com/workspace/sheets/api/scopes) — evaluate file-specific access and avoid broad account permissions where feasible.
