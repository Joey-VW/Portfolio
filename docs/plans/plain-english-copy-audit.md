# Plain-English Copy Audit

## Current status - August 2, 2026

This is a saved July 2026 audit, not a current repository assessment. PHX Transit Pulse received its plain-English pass in PR #36 and is now public; its publication recommendation below is complete and superseded. PR #34 replaced the Procurement placeholder and implemented the Quote-to-Cash case study now titled **Where Revenue Gets Stuck**. Those two analytics projects remain hidden pending rendered publication QA and final copy approval.

Recommendations for global portfolio language, Gravity Fleet, Colony Ops, Shrinkflation, the Publishing System and Postcard Atlas, and small EV terminology corrections remain candidates until the canonical Pass 15 tracker records them complete. Historical observations below are preserved rather than rewritten as if they described current `main`.

## Original audit

I reviewed the then-current `main` branch through the connected GitHub repo, including the homepage, projects registry/hub, the public interactive projects, their dynamically generated UI copy, and the hidden/in-progress project pages that were likely to surface later. I treated visible copy, controls, helper text, statuses, empty/error states, accessibility labels, and data-driven strings as part of the front end; I did **not** treat source-only terminology, CSS class names, or local debug labs as copy problems.

## Overall assessment

The portfolio is already fairly strong in plain English. The problem is less “the site is too technical” and more **the voice changes depending on where you are**.

Your narrative sections tend to explain ideas naturally. Then, as soon as a visitor reaches a dashboard or technical case-study section, the interface starts speaking like its implementation: **telemetry, KPI, benchmark, provenance, normalization, enrichment, fixture, browser-side normalization, tactical scale, header age, data contract**, etc.

That creates exactly the kind of friction a plain-English pass can remove without making the portfolio less technical.

I would use this rule throughout:

> **Tell the visitor what something means first. Use the technical term second, when it adds credibility.**

So not:

> Vehicle freshness
> Header age

but:

> **How recent are the vehicle updates?**
> GTFS-Realtime timestamp age

That preserves domain expertise while making the first read effortless.

---

## Where I would focus

| Priority | Area                              | Opportunity                                                                          | Effort       |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------ | ------------ |
| **P0**   | Gravity Fleet                     | Large concentration of telemetry/analytics/game jargon in actual controls            | Medium       |
| **P0**   | Colony Ops                        | Same issue on a smaller scale                                                        | Small        |
| **P0**   | Shrinkflation Tracker             | Consumer UI starts sounding like a data pipeline in its metrics/data-status sections | Small–Medium |
| **P0**   | Global portfolio language         | Repeated BI/KPI/ETL/internal phrasing and somewhat abstract nav labels               | Small        |
| **P1**   | Publishing System case study      | Strong concept obscured by software-architecture terminology                         | Small        |
| **P1**   | EV Cost Check                     | Already excellent; a handful of analytical labels remain unnecessarily technical     | Very small   |
| **P1**   | Project registry/cards            | Some category and summary copy describes implementation rather than value            | Small        |
| **P2**   | PHX Transit Pulse                 | Needs layered plain-English + transit terminology before becoming public             | Medium       |
| **P2**   | Procurement / CFPB / Video Cutter | Worth addressing when these hidden projects approach publication                     | Small        |
| **Skip** | Debug/dev labs                    | Technical terminology belongs there                                                  | —            |

---

# 1. Global portfolio language

The homepage has good statements such as:

> “I build clean systems, robust automation, and meaningful insights.”

But surrounding language includes things like **BI, ETL, KPI, “decision-ready insights,” “operational friction,” “technical execution,”** and “rendered from project data.” The projects hub similarly describes the portfolio in terms of “stack” and “architecture.” Those are understandable to technical recruiters, but they make the first layer more abstract than necessary.

I would **not remove SQL, BigQuery, ETL, BI, APIs, etc. from the skill inventory.** Technical keywords have value there. I would instead simplify the framing around them.

Examples:

| Current direction                  | Plain-English direction                   |
| ---------------------------------- | ----------------------------------------- |
| Systems • Automation • BI • Design | Systems • Automation • Analytics • Design |
| Weapons of choice                  | Tools I use                               |
| Impact                             | Results                                   |
| Featured                           | Projects                                  |
| standardized KPIs                  | shared performance measures               |
| ETL improvements                   | automated data workflows                  |
| decision-ready insights            | answers people can act on                 |
| rendered from project data         | loaded from the project catalog           |
| stack                              | tools used                                |
| architecture                       | how it works                              |

Your registry also demonstrates the contrast: public project descriptions include terms such as “Interactive Data Viz,” “frontend-only experiment,” “structured telemetry,” and “benchmark dashboards,” even when the projects themselves can be described much more concretely.

I would keep **technical vocabulary as evidence**, rather than use it as navigation.

---

# 2. Gravity Fleet — highest-value rewrite

This is where I would start.

The game itself communicates its concept well:

> “Command an orbital fleet, then turn each match into a clear tactical story.”

But the surrounding interface quickly moves into **telemetry, tactical scale, system mix, faction board, ship transits, KPI, benchmark context**, plus LMB/RMB abbreviations.

The mobile drawer currently includes labels such as **Match telemetry, System mix, Deep-space fights, Ship transits, Star control**, etc.

And the post-match experience explicitly tells users that they will see “KPIs, timelines, heatmap, local history, and benchmark context.”

### Recommended direction

| Current                        | Better first-read label                |
| ------------------------------ | -------------------------------------- |
| Telemetry                      | Live stats                             |
| Match telemetry                | Live match stats                       |
| Telemetry recording            | Recording match stats                  |
| System mix                     | World control                          |
| Faction board                  | Team status                            |
| Control / fleet                | Worlds / ships                         |
| Fleet readiness                | Ships ready                            |
| Source                         | Starting fleet                         |
| Aim                            | Target                                 |
| Launch spikes                  | Ships launched over time               |
| Session telemetry              | Match data                             |
| Post-match analytics dashboard | Your match results                     |
| Demo leaderboard benchmark     | Compare with sample runs               |
| Recent local runs              | Your recent runs                       |
| LMB / RMB                      | Left mouse button / Right mouse button |
| RTS map                        | Strategy map                           |
| Onboarding                     | Beginner                               |

The dynamic code reinforces this vocabulary. For example, a reset explicitly says **“Fleet telemetry will stream here,”** and pausing says that “simulation and telemetry are frozen.”

The analytics comparison then tells the player that their run ranks in a “mock benchmark” and describes local matches as “local runs.”

That can become much more natural:

> **You ranked #4 out of 11 sample matches, placing in the 70th percentile.**

No information is lost.

### One term I would *not* automatically remove

**Wide Periapsis** is specialized language, but it is also a level name. I would keep fun/thematic names and make the explanation accessible underneath:

> **Wide Periapsis**
> Advanced · A wider system with longer routes and stronger opponents.

Currently the level UI adds “100% tactical scale,” which feels like an internal balancing parameter rather than useful player information.

---

# 3. Colony Ops

Colony Ops has essentially the same problem in miniature.

The visitor is instructed to “review the telemetry dashboard,” then later to inspect “KPIs, timelines, heatmap, and benchmarks.” The analytics section talks about “session telemetry” and “mock aggregate runs loaded from JSON.”

None of that implementation detail is necessary to understand the experiment.

I would change:

* **telemetry dashboard** → “results dashboard”
* **KPIs** → “key stats”
* **benchmarks** → “sample runs”
* **mock aggregate runs loaded from JSON** → “sample runs included with the demo”
* **Movement / collection heatmap** → “Where your workers spent time”
* **Demo leaderboard benchmark** → “Compare with sample runs”
* **Recent local runs** → “Your recent runs”
* “worker interpolation effects” → “animation is simplified when reduced motion is enabled”

The generated insight copy also occasionally sounds analytical instead of conversational:

> “Worker utilization stayed healthy for a lightweight simulation run.”

could simply be:

> **You kept your workers busy for most of the run.**

And:

> “You outperformed the benchmark efficiency band.”

could become:

> **Your efficiency beat most of the sample runs.**

Those strings are generated directly by the simulation.

---

# 4. Shrinkflation Tracker

This is interesting because the **top half is one of the best examples of plain English in the repo**.

The page directly explains:

> “Shrinkflation is when a product gets smaller while its shelf price stays the same or rises.”

and then tells the visitor exactly how to read the tracker. That is excellent.

The language degrades lower down.

### Metrics

Current generated cards include:

* Avg. Unit Size Change
* Avg. Shelf Price Change
* Avg. Price per Unit Change
* Normalized cost movement
* Products Flagged

I'd use:

* **Average package size change**
* **Average shelf price change**
* **Average cost-per-unit change**
* **Change after adjusting for package size**
* **Products showing shrinkflation**

### Data-status section

This is the largest opportunity.

Current terms include:

* Live observation coverage
* Parsed sizes
* Needs parsing
* Candidate matches
* Trend-ready
* observations “anchoring” the latest curve
* mock/interpolated quarterly points

For a consumer-facing project, I'd make that section:

**Where the data comes from**

* Products checked
* Price records collected
* Most recent check
* Package sizes read successfully
* Package sizes needing review
* Possible product matches
* Products with enough history to show a trend

And something like:

> **Recent Fry’s/Kroger observations are used when available. Because there isn't yet two years of collected history, the longer trend lines include clearly labeled sample values.**

That is especially important because the interface says **“live”** in places while mixing collected observations with modeled history. The distinction exists today, but a normal visitor has to work to understand it.

### Method section

“Normalize price by package size” is technically accurate, but:

> **Calculate the cost per ounce, pound, or item**

would be much easier.

“Demo curve stays curated” is particularly implementation-oriented.

I would move the raw formulas behind something like **“Show the math”**. Keep them—the formulas add credibility—but make them optional technical depth rather than the main explanation.

---

# 5. EV Cost Check

This one needs the least work.

The storytelling is already grounded in an actual question:

> “where does an EV become cheaper?”

The receipt, comparison, scenario buttons, and verdict language are very understandable.

I'd primarily change four terms:

| Current               | Suggested                     |
| --------------------- | ----------------------------- |
| Blended electric rate | Average electricity rate      |
| Home charger payback  | Time to recover charger cost  |
| Provenance legend     | Where these numbers come from |
| Gasoline MPG          | Gas mileage (MPG)             |

“EV kWh per 100 miles” could similarly become **“EV energy use”**, with `kWh/100 mi` retained as the unit.

The source system currently uses C/R/B/E chips for Confirmed, Reported, Benchmark, and Estimate.  That's fine if the heading explicitly says what they are.

I'd also fix the small grammatical issue:

> “Choose a set up to see how it stacks against the Honda.”

→

> **Choose a setup to see how it compares with the Honda.**

The preset copy itself is already clear: “Today: public charging,” “Next: mostly home,” and “Home-only test.”

---

# 6. Multi-Platform Publishing System

This is probably the biggest **case-study prose** opportunity.

The irony is that the project demonstrates a system intended for a nontechnical publisher, but its explanation uses some of the most engineering-heavy language in the portfolio:

* static frontend
* structured content rows
* browser-side normalization
* predictable data contract
* cache busting
* media normalization
* stable keys
* deep links
* sanitized local fixtures
* portfolio-scoped routes
* release gate
* operational rather than architectural
* registry entry

There is a very accessible story underneath:

> **The publisher keeps working in familiar Google tools. The website reads those updates and automatically turns them into journal entries, photo galleries, and map stops—without asking the publisher to edit code.**

Then the technical section can explain CSV, Apps Script, Cloudflare, normalization, etc.

Examples:

* “structured content rows” → **rows in a Google Sheet**
* “predictable data contract” → **a consistent set of fields**
* “browser-side normalization” → **the site converts each row into a consistent format**
* “deep links” → **links that open the exact story, photo group, or map stop**
* “network failures degrade to local content” → **if the live source is unavailable, visitors still get fallback content**
* “sanitized local fixtures” → **fictional sample data**
* “release gate is operational rather than architectural” → **the system is built; what remains is final launch verification**

The Postcard Atlas demo itself is much better. Its travel-facing language is approachable.

The jargon mostly reappears on its About page:

> “Structured rows become journal entries… through shared browser-side normalization.”

and:

> “The production pattern supports published Google Sheets CSV data…”

That page should probably be the *plainest* explanation of the architecture.

One tiny UI fix: **“Open source image”** in the photo viewer can read as “open-source image.” I would use **“Open original image.”**

---

# 7. Project cards and taxonomy

I would do a focused pass on `data/projects.json` because it influences multiple surfaces.

For example:

**Gravity Fleet**

Current:

> “A frontend-only experiment showing how real-time canvas interactions can produce structured telemetry, scoring, heatmaps, and benchmark dashboards.”

Possible:

> **“A playable strategy experiment that records each match and turns it into scores, trends, movement maps, and post-game insights.”**

**Colony Ops**

Current:

> “A playable 60-second colony resource allocation simulation that turns session telemetry into KPI dashboards, charts, heatmaps, and benchmarks.”

Possible:

> **“A 60-second resource game that turns your decisions into scores, charts, movement patterns, and comparisons with sample runs.”**

This is a good place to distinguish:

**Category = understandable concept**
**Stack = technical keywords**

So:

> Interactive Data Viz

could become:

> **Interactive analytics**

while the stack can continue listing Canvas, JavaScript, telemetry, etc.

---

# 8. PHX Transit Pulse - completed and superseded

This recommendation described the July 2026 baseline. PHX Transit Pulse received the planned plain-English pass in PR #36 and is now public; use the canonical roadmap for any later copy work.

Importantly, I would **not strip the transit terminology out**. This project is specifically showing that you can reason about transit operations and GTFS-Realtime.

Instead, use dual-layer labels.

For example:

| Current                         | Suggested                       |
| ------------------------------- | ------------------------------- |
| Demonstration state             | Demo scenario                   |
| Vehicle freshness               | How recent are vehicle updates? |
| Timestamp age                   | Age of last vehicle position    |
| Trip exceptions                 | Cancelled or skipped service    |
| Explicit source states          | GTFS-Realtime trip states       |
| Feed freshness                  | How recent are feed updates?    |
| Header age                      | GTFS-Realtime feed age          |
| Missing enrichment              | Missing route or trip details   |
| Static enrichment               | Details added from the schedule |
| Headsign                        | Destination sign (headsign)     |
| Bearing                         | Direction (degrees)             |
| Operational picture unavailable | Vehicle map unavailable         |

Current dashboard labels include “Vehicle freshness,” “Trip exceptions,” “Static enrichment,” and “Header age.”

And dynamically generated KPIs include **“Avg predicted delay,” “Provisional fixture formula,”** and **“Missing enrichment.”**

The disclosure language, however, is already excellent:

> “Mock data only”

> “Every route, vehicle, alert, and metric shown is fictional.”

I would preserve that explicitness almost exactly.

---

# 9. Hidden case studies

I wouldn't spend implementation time on these yet, but I'd record them as prerequisites for publication.

**Procurement** currently uses KPI views, staging tables, facts and dimensions, anomaly detection, and metric contracts.

**CFPB Complaint Intelligence** has API ingestion, analytical tables, risk-signal narrative layers, embeddings-based clustering, etc.

**Video Cutter Lite** is considerably better, although phrases like “FFmpeg-powered export steps,” “crop overlays,” and “media tooling” could use short explanations when it becomes public.

These are correctly hidden today according to the registry, so I'd defer them.

---

## A style standard I'd apply repo-wide

I think a plain-English pass should follow six rules rather than just replacing a list of words:

1. **Primary labels describe meaning; secondary copy can provide technical terminology.**
2. **Spell out unfamiliar acronyms on first use.** Keep SQL, API, GTFS, KPI, ETL, etc. where they demonstrate skills, but don't require the visitor to know them to navigate.
3. **Buttons describe the action.** “View live stats” beats “Telemetry.”
4. **Explain comparisons in human terms.** “Compared with 10 sample matches” beats “mock benchmark set.”
5. **Be unusually explicit around real vs. sample vs. modeled data.** PHX already does this very well; Shrinkflation needs the most attention here.
6. **Put implementation detail one layer deeper.** Formulas, architecture, schemas, raw methodology, and technical terminology belong under “How it works,” “Show the math,” or an equivalent expandable section.

The goal shouldn't be to make the portfolio sound less technical. It should make the **first reading effortless and the second reading impressively technical**.

---

## Recommended implementation sequence

I'd split this into three manageable passes.

**Pass A — public interaction copy:** Global/header/footer terminology, Gravity Fleet, Colony Ops, and project-card summaries. This will produce the largest immediate improvement.

**Pass B — consumer case studies:** Shrinkflation data-status/method wording, EV's handful of analytical terms, and Publishing System/Postcard Atlas explanations.

**Pass C — publication readiness:** Apply the same pattern to PHX Transit Pulse, Procurement, CFPB, and Video Cutter as each approaches public visibility.

I would avoid a giant blind search-and-replace. “Telemetry,” for example, is perfectly appropriate in technical documentation and code but often unnecessarily opaque when used as a button label.

No repository files were changed during this review.

If you want to hand the implementation to Codex afterward, this audit lends itself well to a scoped GitHub-issue-style prompt with explicit files, requirements, constraints, acceptance criteria, and verification—the structure in your Codex prompt note is a good fit for that. 

**My recommendation is to tackle Pass A first.** It is relatively low-risk copy work and would establish the vocabulary standard we can then apply consistently everywhere else.
