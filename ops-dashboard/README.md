# Ops Desk

Live page: https://claude.ai/artifact/XRmBDFou4sMNkTzBpWtWRy (private to Connor's account).

`index.html` is the page source. It renders whatever is in the artifact's own
database at `snapshots/latest`, so the page never needs a redeploy to change;
the business partner routine (`../business-partner/ROUTINE-PROMPT.md`) writes a
new snapshot every morning and a dated copy under `history/<date>`.

`snapshot-2026-10-22.json` is the first snapshot, seeded by hand from the
2026-10-22 review. Its shape is the contract the routine follows.

To change the page itself: edit `index.html` and republish with the Artifact
tool to the same URL (`url` parameter), from any session.
