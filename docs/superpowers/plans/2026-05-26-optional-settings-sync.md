# Optional Settings Sync Plan

## Steps

1. Add failing tests for sync opt-in and local-only history.
2. Add `syncEnabled` and explicit sync payload helpers to extension core.
3. Move popup and content settings reads to local-by-default with sync merge when enabled.
4. Add popup Settings Sync toggle and explanatory copy.
5. Update background defaults, legal/privacy text, Chrome Store submission notes, and roadmap.
6. Repackage the extension ZIP and SHA.
7. Run extension tests, typecheck, build, and package checks.
