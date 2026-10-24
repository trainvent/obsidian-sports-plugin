# Sports product direction

Sports is listed in Obsidian's community plugins directory. This document records
its current scope and development direction. Setup instructions live in the
[README](README.md); the import contract lives in [Workbook.md](Workbook.md) and
[Tracking.md](Tracking.md).

## Product goal

Connect training plans, recorded results, tracker activities, and reflections so
people can review what they planned, what they did, and what to adjust next week.
Keep the spreadsheet useful on its own and the resulting notes readable as Markdown.

## Current scope

- Desktop Obsidian plugin with a dashboard, command-palette actions, and settings.
- Read-only HTTPS workbook sync for XLSX and ODS, including Nextcloud file shares.
- Independently selectable strategy, tracking, and recurring-schedule sheets.
- Templates with goals, weekly plans, session recording, scoring, an exercise library, and added loads.
- Flexible tracking with custom exercise groups or one row per set/measurement.
- Linked overview, plans, calendar, logs, day notes, weekly reviews, goals, and routines.
- Local charts for exercise comparisons, workbook scores, and Garmin trends.
- Optional experimental Garmin activity imports and published adaptive Coach summaries.
- Cached data, completed-history checks, protected generated sections, and note recovery actions.

## Product principles

**Keep sync one-way.** Workbooks supply plans and results; Obsidian holds generated
views and personal reflections. Template downloads are a separate action.

**Keep sources explicit.** Garmin activities, workbook results, and recurring plans
remain distinct. Attendance does not prove goal achievement or complete a manual session.
Missing measurements stay missing.

**Protect history and writing.** Preserve stable session identities, completed
training, part versions, and commentary. Report conflicts rather than overwrite edits.

**Keep connections optional.** Cached views and notes remain available offline.
Network access starts only after a user configures a workbook link or connects Garmin.
No hosted Sports account or telemetry is required.

**Generalize the examples.** Template exercise names, set counts, equipment, and
training values illustrate the format; they are not requirements or personal recommendations.

## Next priorities

These are development directions, not promised release dates.

- Verify Garmin sign-in, MFA, token refresh, activity sync, and Coach behavior with live accounts.
- Improve first-run guidance and workbook validation feedback.
- Preview imported additions, changes, and removals before applying them.
- Improve generated-note conflict recovery and interruption recovery across multiple files.
- Make removed unfinished-session handling clearer before expanding plan management.
- Improve timezone handling for recurring schedules and calendar navigation.
- Review keyboard access, narrow layouts, and performance with larger histories.

## Possible later work

- Per-occurrence recurring-schedule changes, exceptions, and rescheduling.
- More flexible workbook mapping and multiple active plans.
- Activity-file imports and additional tracker adapters, subject to feasibility and privacy review.
- Mobile support after replacing or adapting desktop connection dependencies.

Watch uploads, external calendar sync, and automatic coaching are outside the current
scope. Local-file workbook access and authenticated cloud connectors are not current features.
