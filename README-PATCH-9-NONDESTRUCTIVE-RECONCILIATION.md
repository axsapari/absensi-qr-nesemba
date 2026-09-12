# PATCH v9 — Non-Destructive Attendance Reconciliation

## Why v9
PATCH v8 could make local attendance disappear during background/focus auto-sync. The old cleanup logic treated a temporary/local student-ID or NISN mismatch as an orphan and removed attendance from localStorage. Supabase attendance remained intact, so the UI appeared empty after returning to the tab.

## Changes
- Background sync no longer deletes local students, attendance, or WA logs merely because a student mapping is temporarily unresolved.
- Unresolved attendance remains local and is retried after master mapping becomes available.
- Today's remote attendance is reconciled back into local state after a successful sync. Remote canonical IDs are used when available.
- Historical local attendance is preserved.
- Fresh unsynced local scans are preserved during reconciliation.
- Reset/delete queue remains processed before reconciliation, so successfully deleted cloud rows are not immediately restored.
- Supabase remains the cloud source for today's already-synced attendance; localStorage remains the offline cache.

## Recommended test
1. Scan several students.
2. Confirm they appear in the app and Supabase.
3. Switch to another browser tab.
4. Return to the app.
5. Attendance must remain visible.
6. Repeat with offline scan -> online -> tab switch.
7. Repeat delete/reset and confirm Supabase is also cleared.

## Build note
This source ZIP intentionally excludes node_modules. Full Vite build was not run in this environment because dependencies were unavailable.
