# Rules engine provenance

Source: user's `dnd-rpg-cli-mcp` repository, committed snapshot `905beabe71de91f3b1af0b30ba284d942787352b`.

Only `src/core/` and its MIT license were imported with `git archive`. Uncommitted edits, credentials, saves, browser/CLI providers and application assets were not imported. This snapshot is independent of the adjacent checkout.

Changes in this project are isolated in the application adapter. `entry.ts` and `scripts/build-rules.js` compile the source into an ESM module; built output is not committed.

One storage fix is applied in the snapshot: `state/store.ts` writes the SQLite export to a temporary file and renames it, avoiding a partially overwritten database after interruption.
Trailing spaces in four upstream TypeScript files have also been normalized; no rules logic was changed by that formatting step.

## SRD attribution

This work includes material from the System Reference Document 5.1 (SRD 5.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

The SRD text has been represented as executable rules and structured game content. Original compatible content and application code remain under their respective MIT licenses. This project is unofficial and does not include an endorsement by Wizards of the Coast.
