# The Real Cost of Public Charging - Foundation Specification

## Purpose

Lay a durable, honest foundation for a new consumer analytics case study in `Joey-VW/Portfolio` without pretending the incomplete total-cost dataset is finished.

The first release should answer one narrow question well:

> Does an EV actually save money - and under what charging conditions?

The foundation is an interactive operating-energy comparison, not yet a definitive lifetime ownership verdict. It must make confirmed facts, owner-reported inputs, benchmarks, and temporary mock assumptions visibly distinct.

## Repository decisions

- Base repository: `Joey-VW/Portfolio`
- Base branch: current `main`
- Base commit observed while planning: `2ab078f34b4dabc003c4a5d1b79390ab8c3215f3`
- Architecture: static HTML, CSS, JavaScript, and committed JSON; no framework and no build step.
- New route: `/projects/ev-true-cost.html`
- New data source: `/data/ev-true-cost.json`
- New page assets: `/projects/ev-true-cost.css` and `/projects/ev-true-cost.js`
- Add the project to `data/projects.json`, but set `featured: false` and append it after the existing entries for this foundation pass.
- Do not change `script.js`, Showcase launcher offsets, animation, filtering, node count, or existing featured flags. The launcher deliberately renders seven featured nodes into seven tuned positions. Promotion into that launcher belongs in a later pass.

## Product identity and copy

- Project title: `The Real Cost of Public Charging`
- Category: `Consumer Analytics`
- Primary question: `Does an EV actually save money - and under what conditions?`
- Short summary: `An interactive cost model showing how mileage, fuel economy, electricity prices, and charging behavior change the real operating savings of an EV.`
- Project value: `A transparent consumer analytics case study that separates confirmed receipts from benchmarks and mock assumptions, then turns them into an adjustable cost-per-mile comparison.`
- Suggested stack: `HTML`, `CSS`, `JavaScript`, `JSON`, `Scenario modeling`, `Data visualization`
- Foundation status label: `Foundation model`

Suggested hero copy:

- Eyebrow: `Consumer analytics case study`
- Heading: `The Real Cost of Public Charging`
- Hero title: `Does an EV actually save money - and under what conditions?`
- Hero summary: `Compare gasoline, public fast charging, and future home charging with a model that shows exactly which inputs are confirmed and which are still estimates.`
- Primary action: `Compare scenarios`
- Secondary action: `See the method`

Avoid lengthy introductory prose. Let the central comparison become visible within the first viewport on a typical desktop.

## Experience concept

The central visual idea is a compact two-lane energy comparison:

- Warm amber lane: gasoline Honda Pilot baseline.
- Electric cyan lane: Kia EV9 scenario.
- Violet can be used sparingly for blended home/public charging.
- The leading result is cost per mile, followed by annual energy cost and annual difference.

The UI should feel related to the existing portfolio and Shrinkflation Tracker while having its own composition. Do not clone the Shrinkflation product-card grid.

Use restraint:

- One strong comparison visualization.
- Three scenario presets.
- A compact assumptions panel.
- A small provenance legend.
- A concise method section.
- No stock vehicle photography or external image dependencies.
- Inline SVG or CSS-native energy/vehicle motifs are acceptable.

## Page structure

1. Project-context top navigation matching other case-study pages.
2. Hero with foundation-status label and question-led copy.
3. Compact sticky section navigation, if it remains clean on mobile.
4. `Scenario comparison` section:
   - Preset buttons: `Public charging today`, `Mostly home charging`, `Home charging only`.
   - Central ICE-versus-EV comparison.
   - Cost per mile.
   - Annual energy cost.
   - Annual savings or additional cost using neutral wording.
5. `Adjust the model` section:
   - Annual miles.
   - Gasoline MPG.
   - Gas price per gallon.
   - EV kWh per 100 miles.
   - Home electricity rate.
   - Public electricity rate.
   - Home-charging share.
   - Installed home-charger cost.
   - Inputs must be labeled with units and have sensible min/max/step values.
   - A reset control restores the seed scenario.
6. `Charging receipt` evidence card:
   - Electrify America Pass.
   - 49.6 kWh delivered.
   - $30.08 paid after tax.
   - 18 minutes.
   - 205 kW maximum.
   - $0.6065/kWh effective all-in rate.
   - Do not expose email addresses, session ID, charger ID, VIN, or other unnecessary personal identifiers.
7. `What changes the answer?` section:
   - Public fast charging can eliminate energy savings.
   - Home charging can reverse the comparison.
   - Purchase price and full ownership costs are not yet included.
8. `Method and data status` section:
   - Formula summary.
   - Provenance legend.
   - Explicit total-cost roadmap.

## Data contract

Use the attached `ev-true-cost-seed-data.json` as the source for `/data/ev-true-cost.json`.

Do not flatten provenance out of the data. Preserve `value`, `unit`, `provenance`, `sourceId`, and `note` where present. UI results should derive from loaded data and current form state, not from prewritten HTML totals.

The latest confirmed charging session supplies the default public all-in rate:

```text
publicRate = totalPaidUsd / energyDeliveredKwh
           = 30.08 / 49.6
           = 0.6064516129 USD/kWh
```

The explicit stored effective rate is a validation aid. Recompute it and validate that the stored value agrees within a small tolerance.

## Calculation rules

Keep full precision internally. Round only while formatting the UI.

```text
iceGallonsPerYear = annualMiles / iceMpg
iceAnnualEnergyCost = iceGallonsPerYear * gasPricePerGallon
iceCostPerMile = iceAnnualEnergyCost / annualMiles

evAnnualKwh = annualMiles * evKwhPer100Miles / 100
blendedElectricRate =
  (homeChargingShare * homeRate) +
  (publicChargingShare * publicRate)
evAnnualEnergyCost = evAnnualKwh * blendedElectricRate
evCostPerMile = evAnnualEnergyCost / annualMiles

annualSavings = iceAnnualEnergyCost - evAnnualEnergyCost
```

Use shares as decimals in calculations and ensure home plus public share equals 1.

For the charger payback shown in the foundation:

```text
publicOnlyAnnualCost = evAnnualKwh * publicRate
selectedAnnualCost = evAnnualKwh * blendedElectricRate
annualChargingSavings = publicOnlyAnnualCost - selectedAnnualCost
chargerPaybackMonths = chargerInstalledCost / annualChargingSavings * 12
```

Only show payback when:

- charger cost is greater than zero,
- home-charging share is greater than zero, and
- annual charging savings are positive.

Otherwise show a short explanatory state instead of `Infinity`, `NaN`, or a misleading zero.

## Required baseline results

With the untouched seed inputs, results should agree with these values after display rounding:

| Scenario | EV cost/mile | EV annual cost | Difference vs gasoline |
| --- | ---: | ---: | ---: |
| Gasoline Pilot baseline | $0.1736 | $2,604.55 | Baseline |
| Public charging today | $0.2305 | $3,456.77 | $852.23 more |
| Mostly home charging | $0.0917 | $1,375.35 | $1,229.19 saved |
| Home charging only | $0.0570 | $855.00 | $1,749.55 saved |

Additional checks:

- Annual EV energy: `5,700 kWh`.
- Public all-in rate: `$0.6064516129/kWh` before display rounding.
- A $2,000 charger compared with continuing public-only charging pays back in about `9.2 months` under the home-only mock scenario.
- The confirmed session's average delivered power is about `165.3 kW`, but this is supporting evidence rather than a primary financial result.

## Provenance presentation

Every adjustable input should carry a compact provenance indicator:

- `Confirmed`
- `Owner reported`
- `Benchmark`
- `Mock`

Use a tooltip, visually hidden description, or concise legend to explain the statuses. Do not scatter verbose warnings across every card.

The page must say that:

- the public rate comes from one confirmed charging session,
- the home rate and charger installation are temporary assumptions,
- the Pilot MPG is a benchmark until the exact trim or owner-observed MPG is available,
- full ownership cost is planned but not included in the current result.

Never label the model as live data.

## Private working data

The seed file contains `privateWorkingContext` with the approximate special EV acquisition price and actual Pilot sale amount. Keep that object in the JSON for future analysis, but do not render it or expose it in browser-visible cards during this foundation pass.

If preserving private context in a publicly served JSON conflicts with the repository's deployment model, move it into a clearly local-only or ignored working file instead of shipping it. Do not silently publish it. Prefer removing the private object from the committed public JSON and documenting where the future private input belongs.

## Total-cost roadmap

Do not calculate or claim a full five-year ownership result yet. The current model lacks dependable values for:

- comparable gasoline vehicle purchase price,
- financing,
- insurance,
- registration and EV fees,
- maintenance,
- tires,
- depreciation.

Create a concise `Total ownership model - coming next` section or roadmap card. Do not invent those values merely to populate the page.

## Accessibility and resilience

- Semantic headings and regions.
- Proper labels for every form control.
- Preset controls must be real buttons with an exposed selected state.
- Results update in an `aria-live="polite"` region without becoming noisy.
- Keyboard-accessible reset and controls.
- Clear focus-visible styling.
- Do not rely on color alone for positive versus negative results.
- Respect `prefers-reduced-motion`.
- Use accessible text or table alternatives for visual comparisons.
- Display a useful data-load error with local-server guidance.
- Mobile layout must remain readable around 390px wide.

## Validator

Add `tools/validate_ev_true_cost.py` using only the Python standard library.

It should:

- load `data/ev-true-cost.json`,
- verify required top-level objects and key fields,
- verify finite positive numerical inputs,
- verify each preset's shares total 100,
- recompute the public all-in rate from the receipt,
- verify the stored rate within tolerance,
- calculate the three baseline scenarios,
- compare them with the required results within a small tolerance,
- fail clearly with a nonzero status when validation fails,
- print a compact success summary when validation passes.

## Repository integration

Append this entry to `data/projects.json` for the foundation pass:

```json
{
  "slug": "ev-true-cost",
  "title": "The Real Cost of Public Charging",
  "category": "Consumer Analytics",
  "summary": "An interactive cost model showing how mileage, fuel economy, electricity prices, and charging behavior change the real operating savings of an EV.",
  "value": "A transparent consumer analytics case study that separates confirmed receipts from benchmarks and mock assumptions, then turns them into an adjustable cost-per-mile comparison.",
  "stack": [
    "HTML",
    "CSS",
    "JavaScript",
    "JSON",
    "Scenario modeling",
    "Data visualization"
  ],
  "href": "/projects/ev-true-cost.html",
  "repo": "https://github.com/Joey-VW/Portfolio",
  "featured": false
}
```

Update `README.md` with the route, data file, validator command, and one sentence explaining that the current release is an operating-energy foundation with source-aware assumptions.

## Out of scope for this pass

- Environmental lifecycle analysis.
- Road-trip route planning.
- Real-time charger or utility APIs.
- Scraping.
- Full ownership/depreciation claims.
- Uploading or embedding the original receipt PDF or window-sticker image.
- Changing Showcase launcher behavior or its seven-node layout.
- New dependencies, frameworks, bundlers, or chart libraries.
- Large-scale changes to shared `styles.css` or `script.js`.

## Verification

Run at minimum:

```bash
python -m json.tool data/ev-true-cost.json
python -m py_compile tools/validate_ev_true_cost.py
python tools/validate_ev_true_cost.py
node --check projects/ev-true-cost.js
git diff --check
```

Serve the repository from its root and confirm:

- `/projects/ev-true-cost.html` loads,
- the default result matches the required baseline,
- each preset produces the expected result,
- editing inputs updates results without a refresh,
- reset restores seed values,
- the project appears on `/projects/`,
- the homepage's existing four-card order and Showcase's seven nodes are not changed,
- there are no console errors,
- desktop and mobile layouts are visually coherent.

If Playwright is available, use the repository capture utility for a visual check. If it is unavailable, report that limitation without installing unrelated dependencies.

