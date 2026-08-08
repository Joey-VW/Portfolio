# Legacy Analytics Portfolio Migration Review & Action Plan

**Repositories reviewed**

* Legacy: [Joey-VW/DataAnalyticsPortfolio](https://github.com/Joey-VW/DataAnalyticsPortfolio)
* Current: [Joey-VW/Portfolio](https://github.com/Joey-VW/Portfolio)
* Review date: July 28, 2026

## Current status - August 7, 2026

Passes 14.0-14.3 are implemented in the current portfolio. Procurement KPI Analysis and the Quote-to-Cash case study, publicly titled **Where Revenue Gets Stuck**, now have deterministic pipelines, browser experiences, data contracts, validators, and the shared focused `DataFrameInspector`. Both registry entries are public and ready. Pass 14.4 legacy-repository retirement remains blocked until both migration outcomes are settled.

The audit and future-tense implementation sections below are retained as historical design rationale. Where they describe placeholders, hard-coded legacy workflows, or work still to be built, they describe the reviewed baseline rather than current `main`. The completion checkboxes and publication gates in `PORTFOLIO_ROADMAP.md` are authoritative.

## Executive summary

The old portfolio contains **two projects worth carrying forward**:

1. **Procurement KPI Analysis — migrate and substantially modernize**
2. **Quote-to-Cash Workflow Audit — migrate and rebuild as a second, complementary analytics case study**

The `DataFrameInspector` utility is also worth preserving selectively as supporting implementation code, but **not as its own portfolio project**.

**ScrapeX should not be migrated**, per the explicit decision to retire it.

I would also correct one unrelated piece of current-portfolio metadata: **CFPB Complaint Intelligence is not actually a legacy project from `DataAnalyticsPortfolio` based on the repository material I found.** The new registry currently points it at that repository, so it should remain a separate hidden/planned project and eventually point to its actual implementation location.

The most important strategic reason to do this migration is portfolio balance. The current public portfolio is strong in consumer analytics, interactive visualization, telemetry, and web systems, while Procurement is currently the only registered project centered explicitly on **SQL, BigQuery, Python, pandas, Looker Studio, and data QA** - and it is still hidden. Publishing a strong Procurement project, followed by Quote-to-Cash, would make the “Analytics / BI” part of the portfolio substantially better evidenced.

This should **not** be a straight copy of the old work. The current portfolio has a much higher presentation standard: for example, the EV project combines a plain-English story, evidence, interactive analysis, editable assumptions, methodology, and a project-specific visual experience.

The roadmap's own north star is that every public project should demonstrate both technical judgment and thoughtful presentation. That is the standard these older analytics projects should be rebuilt to meet.

---

# 1. Migration decision matrix

| Legacy asset                                       | Decision                       | Priority | Recommended role                               |
| -------------------------------------------------- | ------------------------------ | -------: | ---------------------------------------------- |
| **Procurement KPI Analysis**                       | **Bring over and rebuild**     |  Highest | Flagship traditional BI / analytics case study |
| **Quote-to-Cash Workflow Audit**                   | **Bring over and rebuild**     |     High | Revenue/process analytics case study           |
| **DataFrameInspector**                             | **Extract selectively**        |   Medium | Shared offline analytics helper                |
| PivotTable / PivotChart / BigQuery utility classes | Select only if actually needed |      Low | Supporting tooling, not portfolio content      |
| **ScrapeX**                                        | **Do not migrate**             |     None | Leave as legacy history                        |
| Legacy root README / portfolio structure           | Do not migrate                 |     None | Replace with modern case-study presentation    |
| CFPB Complaint Intelligence                        | Not a legacy migration         | Separate | Keep hidden until independently implemented    |

My recommended public hierarchy after modernization would be:

* **Procurement KPI Analysis:** public and probably `featured: true`
* **Quote-to-Cash Workflow Audit:** public, but initially `featured: false`
* Keep the homepage/Showcase focused rather than automatically featuring every project.

---

# 2. Procurement KPI Analysis

## Verdict: definitely migrate

This is the strongest legacy asset.

The old project already has the major pieces of a legitimate end-to-end analytics project:

* programmatic Kaggle ingestion;
* pandas transformation;
* explicit BigQuery schema;
* BigQuery loading;
* supplier KPI SQL;
* dynamic category-level analysis;
* Looker Studio dashboarding;
* documented business findings.

The underlying Kaggle dataset also remains available. Kaggle currently describes it as **700 anonymized purchase orders from 2022–2023** and lists it under **CC0 / Public Domain**, which makes it unusually convenient for a reproducible public portfolio case study. That provenance should still be described as the dataset publisher's claim rather than independently verified company data.

### What should be preserved

Preserve the **ideas and analytical work**, not necessarily the files unchanged:

* `etl_pipeline.py`
* KPI definitions
* supplier-level SQL
* category-level analysis
* original Looker Studio dashboard/screenshots
* source dataset citation
* original analytical conclusions as historical reference
* use of BigQuery as the warehouse implementation

These make a very credible technical backbone.

### Where the current implementation falls short

#### A. The ETL is a prototype, not yet a production-quality pipeline

The script currently hard-codes the dataset, GCP project ID, destination table, schema, and `replace` behavior. It downloads the dataset, searches for the first CSV, **moves** that CSV into the working directory, transforms the dates, prints an inspection summary, and replaces one BigQuery table.

For a modern case study, I would add:

* configuration/environment separation;
* deterministic input handling;
* source version/provenance metadata;
* explicit data-quality assertions;
* error handling;
* standard logging;
* reproducible local output;
* tests around transformations and KPIs.

The public website itself should **not require BigQuery credentials**. BigQuery can remain part of the documented implementation while an offline Python task generates a small committed JSON artifact for the browser.

That preserves the portfolio's intentionally build-light/static architecture.

#### B. Data inspection is currently presented as data validation

The existing pipeline invokes `DataFrameInspector` and prints the result, but it does not establish hard quality gates before loading.

The **current new-portfolio placeholder goes farther than the underlying implementation**, saying that the project “added validation checks” and describing “staging tables,” “clean facts and dimensions,” and dashboard views. Those claims are not evident in the legacy implementation I reviewed.

Before publication, choose one of two routes:

**Preferred:** implement the stronger architecture.

Or:

Rewrite the page so it accurately describes the simpler pipeline.

I recommend implementing the stronger version because it would materially improve the project.

#### C. KPI methodology needs to become explicit

Several KPIs are good, but assumptions are buried in SQL.

For example, the “On-Time Delivery Rate” defines on-time as delivery within **10 days**, with the SQL itself saying this is an assumed target.

That should become part of a formal metric dictionary:

* what counts as delivered;
* how missing delivery dates are handled;
* the on-time target;
* weighted negotiation-savings formula;
* defect-rate denominator;
* compliance denominator;
* treatment of partial/cancelled orders.

The ETL documentation also describes `W-SAT` derived values as a “week start (Saturday).” The code/documentation semantics should be explicitly verified before that claim is carried forward.

#### D. “Best supplier” conclusions need a defined decision rule

The legacy analysis calls suppliers “best overall” or “worst” based on several competing measures.

The individual KPIs support trade-off analysis, but there is no documented weighting model establishing a single objective “best.”

This presents an excellent opportunity for the new version.

### Recommended signature interaction: supplier priorities

Instead of claiming one supplier is universally best, let the user choose:

* **Balanced**
* **Cost first**
* **Reliability first**
* **Quality/compliance first**

Then transparently rank suppliers using documented weights.

That would turn a methodological weakness into one of the project's strongest features.

It also demonstrates an important business-analysis skill: **the answer changes when the decision criteria change.**

### Recommended new experience

Rather than the generic case-study grid currently at `/projects/procurement-kpi-analysis.html`, build this like the mature portfolio projects:

**Hero**

> **Which supplier is actually delivering the best value?**
> Low prices only help if the supplier also delivers on time, limits defects, and stays compliant.

Then:

1. **The business question**

   * How do we compare suppliers across cost, delivery, quality, and compliance?

2. **The data**

   * 700 anonymized procurement records
   * 2022–2023
   * source/provenance
   * quality limitations

3. **How the pipeline works**

   * Source → Python → validated analytical dataset → BigQuery → KPI layer → browser case study / Looker

4. **Supplier scorecard**

   * cost
   * negotiation savings
   * lead time
   * delivery reliability
   * defect rate
   * compliance

5. **Priority selector**

   * Balanced / Cost / Reliability / Quality

6. **Category drill-down**

   * Electronics
   * MRO
   * Office Supplies
   * Packaging
   * Raw Materials

7. **What the data actually says**

   * quantified findings
   * tradeoffs rather than unsupported winners

8. **Method and limitations**

   * metric definitions
   * assumptions
   * null handling
   * dataset-source caveats

9. **Original BI implementation**

   * Looker Studio screenshots
   * optional original dashboard link if still operational

### Recommended implementation structure

Something along these lines would fit the existing repo well:

```text
projects/
  procurement-kpi-analysis.html
  procurement-kpi-analysis.css
  procurement-kpi-analysis.js

data/
  procurement-kpi-analysis.json

tools/
  procurement/
    build_case_data.py
    validate_case_data.py

docs/
  procurement/
    README.md
    metric-dictionary.md
    data-contract.md
```

Keep BigQuery SQL either under the documentation area or a dedicated `sql/procurement/` folder.

---

# 3. Quote-to-Cash Workflow Audit

## Verdict: migrate, but rebuild more substantially

This project is not as complete as Procurement, but the **concept is very good**.

The notebook models three pieces of a Quote-to-Cash process:

* Salesforce-style opportunities;
* Zuora-style subscriptions;
* RevPro-style revenue recognition.

It explicitly describes these as synthetic datasets inspired by real-world systems, which is the correct transparent framing to retain.

The notebook then joins the systems together through opportunity and subscription IDs.

That is exactly the sort of cross-system analytical thinking worth showing in a BI/operations portfolio.

### Existing useful results

The notebook calculates:

* **59% subscription conversion**
* opportunity creation → close
* close → subscription activation
* activation → revenue recognition.

For the 295 complete records used in the timing analysis, the reported average stage times are approximately:

* **14.6 days** to close
* **10.2 days** from close to subscription start
* **8.1 days** from subscription start to revenue recognition.

The concept is therefore already capable of supporting a real narrative:

> **Where is revenue getting stuck between a won deal and recognized revenue?**

That is much stronger than presenting it as a generic notebook exercise.

### Major analytical issue to fix

The timing analysis currently does:

```python
df = df.dropna().copy()
```

before calculating all three durations.

For an audit project, that is especially problematic because incomplete records may be exactly where workflow problems live.

The modern version should use **stage-specific cohorts** instead:

* conversion denominator = all valid opportunities;
* close duration = opportunities with valid creation/close timestamps;
* activation duration = closed-won records with subscription starts;
* recognition duration = activated subscriptions with recognition data;
* incomplete/missing stage records become an explicit metric rather than disappearing.

This would substantially improve the analytical credibility.

### Synthetic data realism should improve

The source is clearly synthetic, which is fine, but its generated values appear intentionally simple. For example, the opportunity summary shown in the notebook contains only two distinct amount values, and the revenue data likewise has only two recognized amounts.

For the new version I would introduce a **deterministic synthetic-data generator** with documented rules.

Add variation such as:

* product or plan;
* segment;
* deal size;
* close probability;
* billing status;
* activation delays;
* recognition delays;
* intentionally injected exceptions;
* missing links;
* suspended subscriptions;
* recognition backlog.

Use a fixed random seed so the case study remains perfectly reproducible.

### Add real audit checks

This project can become much more than three histograms.

Validate:

* unique opportunity IDs;
* unique subscription IDs;
* opportunity → subscription foreign keys;
* subscription → revenue foreign keys;
* impossible date sequences;
* closed-lost deals with subscriptions;
* missing activation;
* recognition without activation;
* duplicate records;
* unusually slow stage transitions.

These checks become part of the story.

### Recommended new experience

Possible display title:

> **Where Revenue Gets Stuck**

Formal subtitle:

> Quote-to-Cash Workflow Audit

Suggested experience:

1. **Lifecycle overview**

   * Opportunity
   * Closed Won
   * Subscription
   * Revenue Recognized

2. **Conversion funnel**

   * number and percentage surviving each stage

3. **Time between stages**

   * median
   * average
   * p75/p90
   * distribution

4. **Exceptions**

   * missing downstream record
   * delayed activation
   * delayed revenue
   * inconsistent status

5. **Bottleneck view**

   * which stage contributes most elapsed time

6. **Scenario control**

   * “What happens if activation time falls by 3 days?”
   * recalculate total Quote-to-Cash time

7. **Technical method**

   * synthetic generator
   * joins
   * cohort definitions
   * validation rules

8. **What I would do with production data**

   * segment analysis
   * trend monitoring
   * alerting
   * revenue forecasting

The legacy notebook itself ended by identifying outlier detection, revenue-over-time analysis, active-versus-suspended subscriptions, and delay simulations as logical next steps. Those are excellent starting requirements for the rebuilt version.

### Recommended implementation structure

```text
projects/
  quote-to-cash-workflow-audit.html
  quote-to-cash-workflow-audit.css
  quote-to-cash-workflow-audit.js

data/
  quote-to-cash-workflow-audit.json

tools/
  qtc/
    generate_mock_data.py
    build_case_data.py
    validate_case_data.py

docs/
  qtc/
    README.md
    data-contract.md
    methodology.md
```

I would prefer generated CSV/JSON source fixtures over making the Excel workbook the primary data source. The workbook can remain a historical/downloadable artifact if desired.

The project's Git history places the QTC work on **June 30, 2025**, so `2025-06-30` is a sensible `createdAt` value unless you know the work actually began earlier.

---

# 4. `DataFrameInspector` and the Utilities module

## Verdict: preserve the useful idea, not the entire module

The old README describes `DataFrameInspector` as a lightweight helper used during ETL.

The inspector itself remains useful. It provides:

* data types;
* missing counts;
* unique counts;
* example values;
* basic numeric summaries.

That is perfectly reasonable supporting code for the rebuilt analytics projects.

But `Utilities/dataframe_tools.py` has grown far beyond that one concern. The same module also contains pivot-table helpers, charting behavior, Google Cloud monitoring, BigQuery extraction, and BigQuery insertion, and imports pandas, Google Cloud clients, seaborn, matplotlib, NumPy, and other dependencies at module level.

That means code that only needs a small DataFrame summary is unnecessarily coupled to the entire analytics/cloud toolbox.

### Recommended treatment

Extract a focused module:

```text
tools/analytics/dataframe_inspector.py
```

Then add:

* type hints;
* focused docstrings;
* unit tests;
* explicit limits for sample values;
* predictable handling of unusual dtypes.

Only migrate the BigQuery or pivot helpers if the modernized projects actually use them.

Do **not** create an “Analytics Utilities” portfolio card merely to preserve this code.

If the utility later develops:

* a clean package structure;
* tests;
* documentation;
* several demonstrated use cases;
* genuinely reusable API design;

then it could become a separate engineering artifact. It is not there yet.

---

# 5. ScrapeX

## Verdict: leave behind

No migration work.

Per the explicit project decision, the X/Twitter scraping utility is no longer an appropriate active portfolio project.

I would not:

* copy its code;
* add it to `data/projects.json`;
* create a new case-study page;
* use it as a featured example.

It can remain part of the historical Git record.

When the legacy repository is eventually archived, its README can simply identify ScrapeX as an **unsupported historical project that was not migrated**.

---

# 6. CFPB Complaint Intelligence needs a metadata correction

The current portfolio registry has a hidden CFPB project whose `repo` points to `Joey-VW/DataAnalyticsPortfolio`.

The legacy portfolio's documented inventory contains Procurement, ScrapeX, QTC, and utilities; I did not find a corresponding CFPB implementation while reviewing the legacy source/history.

The current CFPB page is also appropriately `noindex` and describes the work as a concept.

### Recommendation

Treat CFPB as an independent future project.

Either:

* remove the `repo` value until implementation exists; or
* point it to `Joey-VW/Portfolio` once its source genuinely lives there.

Do not include CFPB in the legacy-migration scope.

---

# 7. Shared completeness standard for migrated analytics projects

Before either migrated project becomes `ready` + `public`, I recommend requiring all of the following.

## Business narrative

Every project answers:

* What question are we trying to answer?
* Why does it matter?
* Who would use the answer?
* What decision could it change?

## Data provenance

Document:

* where the data came from;
* whether it is real, anonymized, benchmark, synthetic, or assumed;
* date coverage;
* source limitations;
* redistribution/license considerations.

## Reproducible preparation

There should be one clear command or script that can reproduce the browser-ready artifact.

No cloud credentials should be required merely to view the website.

## Data contract

Define:

* tables/entities;
* keys;
* data types;
* relationships;
* permitted nulls;
* validation rules.

## Metric dictionary

Every displayed KPI gets:

* definition;
* formula;
* denominator;
* missing-data behavior;
* important assumption.

## Quantified findings

Avoid conclusions like:

> Supplier A looks better.

Prefer:

> Supplier A has a lower defect rate but slower average delivery; the preferred vendor changes when reliability is weighted more heavily than cost.

## Interactive value

The interaction should help answer the business question rather than exist purely as visual decoration.

## Limitations

Clearly identify:

* synthetic elements;
* assumptions;
* incomplete data;
* external-service limitations;
* what would change in production.

## Validation

Apply the same standards already expected of current production-bound work:

* syntax/JSON validation;
* affected validators;
* direct-route loading;
* desktop and mobile review;
* console/network checks;
* keyboard usability;
* zoom/accessibility;
* reduced-motion behavior where applicable;
* Cloudflare preview before publication.

---

# 8. Recommended action plan

I would formalize this as:

# Pass 14 - Legacy Analytics Modernization

**Initial status: LATER**

The current roadmap still has PHX Transit regression, Pass 09/10 closeout, production release, and final QA ahead of it. I would document Pass 14 now but avoid inserting two substantial new projects into the active release path.

Small metadata/documentation cleanup can happen sooner; the actual builds should follow the current release.

---

## Pass 14.0 - Legacy migration governance

### Work

* Add the detailed migration plan to the repository.
* Record final decisions:

  * Procurement: migrate.
  * QTC: migrate.
  * DataFrameInspector: selectively extract.
  * ScrapeX: retire.
  * CFPB: separate project.
* Add QTC to `data/projects.json` as:

  * `status: "in-progress"`
  * `visibility: "hidden"`
  * `createdAt: "2025-06-30"`
* Keep Procurement hidden during modernization.
* Correct CFPB's repository metadata.
* Preserve links to the historical source until migration is complete.

### Suggested plan file

```text
docs/plans/legacy-analytics-modernization-plan.md
```

### Acceptance criteria

* No unfinished migrated project appears publicly.
* Every legacy asset has an explicit migration decision.
* Project creation dates preserve actual chronology.
* Registry metadata points to the correct source.

---

# Pass 14.1 - Procurement KPI modernization

## Phase A - Analytical foundation

* Reacquire/version the source dataset.
* Preserve source attribution and CC0 information.
* Create a clean data contract.
* Add quality checks:

  * unique `PO_ID`;
  * valid quantities;
  * valid prices;
  * defect counts within valid bounds;
  * parseable dates;
  * impossible delivery sequences;
  * missing deliveries;
  * known compliance values.
* Define all KPI formulas.
* Resolve the weekly-period semantics.
* Make the assumed delivery target explicit.

## Phase B - Reproducible pipeline

Refactor the old pipeline so:

* paths are configurable;
* input data is not destructively moved;
* cloud settings are externalized;
* BigQuery is optional for local generation;
* one script produces deterministic portfolio JSON;
* failures stop the build rather than merely printing diagnostics.

## Phase C - Analytical model

Generate:

* supplier summaries;
* category summaries;
* monthly trends;
* trade-off metrics;
* quality exceptions.

Add transparent ranking presets rather than one universal “best supplier.”

## Phase D - Portfolio UX

Replace the generic placeholder with:

* project-specific CSS;
* project-specific JS;
* a strong business-question hero;
* KPI cards;
* supplier comparison;
* category drill-down;
* priority selector;
* methodology;
* limitations;
* source/provenance;
* optional Looker Studio artifact.

## Phase E - Verification

Add expected-output tests and run the normal portfolio smoke gate.

### Publication criteria

Only change Procurement to:

```json
"status": "ready",
"visibility": "public"
```

when the new case study, source pipeline, metrics, QA, and preview have all been verified.

---

# Pass 14.2 - Quote-to-Cash modernization

## Phase A - Rebuild the synthetic source

Create a deterministic generator for:

* opportunities;
* subscriptions;
* revenue-recognition records.

Document exactly how the synthetic records are created.

Add intentional exceptions so there is something meaningful to audit.

## Phase B - Correct analytical methodology

Replace blanket `dropna()` analysis with stage-specific cohorts.

Calculate:

* opportunity → won conversion;
* won → subscription conversion;
* subscription → recognized conversion;
* median and percentile stage times;
* incomplete/missing-stage rates;
* exception counts.

## Phase C - Add integrity analysis

Detect:

* broken joins;
* impossible timelines;
* duplicates;
* unusually delayed transitions;
* suspended/stalled accounts;
* recognition backlog.

## Phase D - Portfolio experience

Build a plain-English lifecycle experience around:

> Where is revenue getting stuck?

Include:

* lifecycle flow;
* funnel;
* stage-time comparison;
* distributions;
* exception table;
* bottleneck callout;
* optional delay-reduction scenario.

## Phase E - Verification

Validate the generator, joins, calculations, JSON, browser behavior, responsive states, and accessibility.

### Publication recommendation

Make QTC:

```json
"status": "ready",
"visibility": "public",
"featured": false
```

initially.

That lets the full project index demonstrate the additional analytics depth without automatically making the Showcase launcher more crowded.

---

# Pass 14.3 - Analytics utility cleanup

* Extract `DataFrameInspector`.
* Remove unrelated cloud/chart dependencies from that small helper.
* Add unit tests.
* Use it only where it improves the Procurement/QTC source workflows.
* Do not migrate unused utility classes merely for completeness.
* Do not create a public project card.

Acceptance criterion:

> Every migrated helper exists because maintained code actually uses it.

---

# Pass 14.4 - Legacy repository retirement

After Procurement and QTC are public and their source material is safely represented:

1. Rewrite the old repository README as a **Legacy / Archived Portfolio** notice.
2. Link prominently to the current portfolio at `https://wistoworks.com/`.
3. Identify:

   * Procurement → migrated
   * Quote-to-Cash → migrated
   * ScrapeX → unsupported / not migrated
4. Preserve Git history.
5. Archive `DataAnalyticsPortfolio` rather than deleting it.
6. Remove any current-portfolio dependency on the legacy repository other than optional “original version” historical links.

This leaves the old repo useful as provenance without competing with the current portfolio.

---

# 9. Recommended implementation order

### 1. Finish current portfolio release work

Do not destabilize the current release with two additional feature-sized projects.

### 2. Pass 14.0 - governance and metadata

Small and safe.

### 3. Pass 14.1 - Procurement

**First implementation priority.**

It is already closest to completion and fills the most obvious current portfolio skill gap.

### 4. Publish Procurement

Do not wait for QTC.

### 5. Pass 14.2 - Quote-to-Cash

Use lessons and reusable patterns from Procurement.

### 6. Publish QTC

Likely public but not featured initially.

### 7. Pass 14.3 - utility cleanup

Some of this can naturally occur while building the two projects.

### 8. Pass 14.4 - archive the legacy repo

Only after nothing important depends on it.

---

# 10. Final recommendation

The old repository should be treated as **source material, not a package to transplant**.

The best final portfolio would bring forward:

### Procurement KPI Analysis

As a polished, interactive **BI + ETL flagship** showing:

**source → validation → Python → BigQuery → KPI modeling → business decision**

### Quote-to-Cash Workflow Audit

As a polished **process/revenue analytics case study** showing:

**cross-system data → joins → funnel → stage timing → exceptions → operational insight**

### DataFrameInspector

As a small piece of reusable engineering supporting those workflows.

Everything else can remain historical.

That gives the new portfolio two things it currently needs more of: **visible SQL/Python/BigQuery depth and classic business-process analytics**, while keeping the far stronger design, interaction, accessibility, and storytelling standards established by the newer projects.
