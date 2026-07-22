# Gravity Fleet Baseline Notes

## Known-good mobile reference

- Commit: `d8fe7a0ff010dd78815b1ffe3292ec5f0de964d9`
- Source: PR #13
- Result: Full match completed successfully on a physical phone
- Thermal observation: No significant device heating observed
- Orientation tested:
  - Portrait
  - Landscape
- Known limitations:
  - Portrait battlefield uses too little vertical space
  - Landscape controls and HUD overlap
  - Mobile telemetry lacks live charts
  - Wormhole interaction remains unintuitive
  - Hero and header layouts remain oversized or wrapped

## Known-good desktop reference

- Last pre-mobile ancestry point: `121c1307517e0f24d02d4c5ce24c989e6bff96b3`
- Relationship: this is PR #13's base branch head, not `main`.
- Status: historical reference candidate only; it is not promoted to a
  known-good desktop baseline.
- Evidence: commit ancestry establishes that it predates the mobile work. The
  available repository sources and screenshots do not prove its frame pacing,
  full trails and effects, mouse responsiveness, or preferred visual quality.
- Limitation: this environment did not have an authenticated historical
  checkout or a previously captured desktop performance trace. Direct visual
  and performance verification of that commit was therefore not possible.

The current PR A checkout must be compared against that candidate in a human
desktop session before PR B changes runtime timing. Until then, the desktop
baseline is explicitly unresolved rather than guessed.

## Baseline preservation rules

- Do not rewrite or remove the known-good mobile reference branch until the
  modernization branch reaches equivalent playthrough capability.
- Record performance measurements before altering the runtime.
- Preserve existing saved-run compatibility.
- Do not treat screenshots alone as proof of interaction or performance.
