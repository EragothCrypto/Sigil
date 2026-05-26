# Optional Settings Sync Design

## Goal

Make extension preferences portable across Chrome profiles only when the user opts in, while keeping analysis history and dApp session history local by default.

## Scope

- Sync opt-in toggle in the extension popup.
- Syncable fields: protection mode, notification policy, API endpoint, trusted sites, trusted contracts, enabled state, and history limit.
- Local-only fields: recent checks, dApp session summaries, pasted analysis history, and any future sensitive analysis history.
- Keep the existing watchlist import/export flow as the web-app path for watched addresses.

## Design

Use `chrome.storage.local` as the default settings store. When Settings Sync is enabled, write only the explicit preference payload to `chrome.storage.sync` and keep writing the same settings locally for offline/fallback behavior.

On load, the extension reads both local and sync stores. If either store says sync is enabled, synced preferences are merged over local preferences. If sync is disabled, local preferences are used and sync preference keys are removed except for the disabled marker.

## Verification

- Core test proves sync is opt-in and the sync payload excludes history/session data.
- Store-readiness test proves the popup exposes the sync toggle and does not sync history.
- Existing extension tests continue to pass.
