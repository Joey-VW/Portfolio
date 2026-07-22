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

- Commit: To be identified during Pass 10.0
- Evidence required:
  - Smooth frame pacing
  - Full trails and effects
  - Responsive mouse controls
  - Preferred visual quality

Do not assume the PR #13 base is the desktop reference without testing it.

## Baseline preservation rules

- Do not rewrite or remove the known-good mobile reference branch until the
  modernization branch reaches equivalent playthrough capability.
- Record performance measurements before altering the runtime.
- Preserve existing saved-run compatibility.
- Do not treat screenshots alone as proof of interaction or performance.