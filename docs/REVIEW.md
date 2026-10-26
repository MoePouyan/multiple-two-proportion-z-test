# Review: Multiple Two-Proportion Z-Tests Calculator

Reviewed 20 September 2026 against the source at `src/`, with the production bundle built and
driven in a headless browser. Every bug below was reproduced in the running app, not just read off
the code; the reproduction is stated with each one.

**Status: all findings below were fixed in version 1.0.0 on 20 September 2026.** See
`docs/UPGRADE.md` for what changed in each case. This document is kept as the record of what was
wrong and why it mattered.

Findings are ordered by priority.

---

## What the app already gets right

- The core test is correct. Pooled proportion for the standard error, unpooled difference in the
  numerator, two-tailed p-value.
- Verified live: 200 vs 180 successes on bases of 400 returns Z = 1.416, p = 0.15678, which is
  right.
- The batch framing is the right idea. Testing a whole banner point in one pass is exactly the
  crosstab workflow, and no free calculator does it well.
- Bulk paste, per-row or common bases, and CSV export are the right feature set around that idea.

---

## P1. The multiple-comparison problem

This is the finding that matters most, because it is specific to what this app is for.

The app runs *k* independent tests and flags each at p < 0.05, with no family-wise or false
discovery correction. The probability of at least one false positive across the batch:

| Comparisons | Chance of at least one false "significant" |
|---|---|
| 3 | 14.3% |
| 5 | 22.6% |
| 10 | 40.1% |
| 20 | 64.2% |

At the maximum of 20 comparisons, a table where nothing is really different has a roughly two in
three chance of showing at least one significant result. An app built to run many tests at once
and label them significant is, uncorrected, a false-positive generator. This is the single
strongest argument for the tool and against it at the same time.

**Recommendation.** Add a correction selector with three options and apply it to the significance
flag, keeping the raw p-value visible alongside the adjusted one:

- **None.** Current behaviour, for when the comparisons are genuinely pre-registered.
- **Benjamini-Hochberg FDR.** The right default for market research. Sort the *k* p-values
  ascending; the largest *i* where `p(i) <= (i/k)·α` sets the cutoff, and everything up to it is
  significant. Controls the expected proportion of false discoveries rather than the chance of any,
  so it keeps far more power than Bonferroni on a 20-row banner.
- **Holm-Bonferroni.** Strict family-wise control for when a single false positive is costly.
  Uniformly more powerful than plain Bonferroni, with no extra assumptions.

Show the count both ways in the summary line, for example "4 significant uncorrected, 2 after
Benjamini-Hochberg". That contrast is itself the argument for having the feature, and it is the
kind of thing that reads well in a portfolio.

---

## P2. Data loss and silent corruption

### 2.1 Bulk import silently discards the imported data

Reproduced: pasted five rows, pressed Import Data, and the table came back as five rows of
`Item 1 / 50 / 50`. The imported names and figures were gone.

Cause: `handleBulkDataImport` sets `numComparisons` to the imported row count and then sets the
items. The effect

```ts
useEffect(() => { initializeItems(settings.numComparisons); }, [settings.numComparisons]);
```

fires on the count change and overwrites the imported items with defaults.

It only appears to work when the imported row count happens to equal the current count. Reproduced
that too: importing exactly three rows, matching the default, kept the data. So the feature looks
fine against the three-line example in the placeholder and silently fails on everything else.

**Fix:** drop the effect. Grow and shrink the items array in the handler that changes the count,
preserving existing rows, and let bulk import set both the count and the items in one update.

### 2.2 Changing the number of comparisons wipes everything already typed

Reproduced: typed a name and a percentage into row 1, changed the count from 3 to 4, and all four
rows came back as untouched defaults. Same effect, same cause.

For a tool whose whole point is entering a lot of rows, losing the lot because you needed one more
row is the worst possible failure.

**Fix:** as above. Increasing the count appends blank rows; decreasing it truncates from the end,
ideally after a confirmation.

### 2.3 The mode switch reinterprets the data instead of converting it

`TestItem.percentage1` holds a percentage in percentage mode and a raw count in counts mode. There
is no conversion on switch.

Reproduced: entered 200 and 180 as counts, switched to Percentage, and the fields still read 200
and 180, now meaning 200%. The header changes, the numbers do not.

**Fix:** store one canonical representation (successes and base) and derive the other for display,
or convert on switch as the single Z-test tool now does. The field name should stop saying
"percentage" when it may hold a count.

### 2.4 A sample size of 0 silently becomes 1

`parseInt(e.target.value) || 1` turns both an empty field and a typed `0` into 1. Reproduced:
typed 0 into the common sample size and the field immediately showed 1, with results then computed
on a base of one.

The same pattern in the data table, `parseFloat(e.target.value) || 0`, turns a cleared percentage
into 0 rather than leaving it empty, so no field in the app can be cleared and retyped.

**Fix:** hold field values as strings, validate on submit, and never substitute a value the user
did not type.

---

## P3. Correctness: three inputs produce nonsense on screen

### 3.1 Two equal extremes produce NaN

Reproduced: all three rows at 0% versus 0%. Every card showed **Z-statistic NaN, p-value NaN**, and
a grey "Not significant" chip.

When both proportions are 0 (or both 1), the pooled proportion is 0 (or 1), so `p̂(1-p̂)` is 0, the
standard error is 0, and Z is 0/0. This is not an edge case in crosstab work. Two codes that nobody
picked, or two cells at 100%, come up constantly in a banner.

`significant = pValue < 0.05` evaluates NaN < 0.05 as false, so the app reports "not significant"
rather than erroring. It is the right verdict by luck, with NaN printed next to it.

**Fix:** when both proportions are identical, return Z = 0 and p = 1 with a note that the groups
are identical. Guard the zero standard error explicitly.

### 3.2 Out-of-range percentages produce Infinity and a false "significant"

Reproduced: 150% versus 50% gave **Z = Infinity, p = 0.00000**, flagged significant.

`min` and `max` on a number input constrain the spinner, not typed or pasted values, and a bulk
paste bypasses them entirely. Counts above the base do the same thing.

**Fix:** validate `0 <= percentage <= 100` and `0 <= count <= base`, on typing and on import, with
an inline message per row.

### 3.3 Counts mode displays the difference roughly four times too large

`getDisplayValue(value, sampleSize)` computes `round(value · base / 100)`, which converts a
percentage into a count. In counts mode the value already *is* a count, so it is multiplied by
`base/100` a second time.

Reproduced: 200 and 180 successes on bases of 400 displayed **Difference: 80**. The correct answer
is 20. The chart bars are drawn from the same values, so they plot 800 and 720 on a base of 400.

The same function backs `utils/csv.ts`, so the CSV export carries the same inflated figures.
Z and p are unaffected, because `runTests` converts counts to percentages separately before
testing. So the statistics are right and everything shown next to them is wrong.

**Fix:** display counts directly in counts mode. Better, derive both representations from one
canonical store, per 2.3, and the function disappears.

### 3.4 Both chart bars are labelled with the item name

```ts
labels: [result.name, result.name]
```

Reproduced: every card's chart shows "Item 1" under both bars. The labels should be the group
names, which `ResultCard` is never given. Visible in the current screenshots.

**Fix:** pass `group1Name` and `group2Name` into `ResultCard`.

### 3.5 p-values below 0.00001 all print as 0.00000

`pValue.toFixed(5)` floors out, and `normalSF` is computed as `1 - normalCDF`, which loses the tail
to cancellation and returns exactly 0 past about Z = 6. Across twenty rows this means a column of
identical `0.00000` entries that are not comparable with each other.

**Fix:** the single Z-test tool in this portfolio now computes the upper tail from `erfc` directly
and prints small p-values in exponential form. Lift `statistics.ts` from there; the two apps should
not carry different implementations of the same test.

---

## P4. Feature gaps against the sister tool

The single Two-Proportion Z-Test Calculator now has capabilities this one lacks, and they matter
more here, not less, because the batch view is where a reviewer scans for what is real:

- **Confidence level.** Hardcoded at 0.05, in `significant = pValue < 0.05` and in the copy.
- **Confidence interval on each difference.** More valuable in a batch than in a single test,
  because it separates "significant and large" from "significant and trivial" at a glance.
- **Effect size.** Cohen's h, for the same reason. With bases in the thousands, small differences
  become significant and the batch fills with noise.
- **Effective base for weighted data.** Rim-weighted banner percentages tested on nominal bases
  overstate significance on every row at once.
- **Assumption checks.** Per row: normal approximation validity, and very small bases.

Two things this app should keep that the single tool does not need: a **results table** view, and
sorting.

---

## P5. Interaction and presentation

### 5.1 Twenty cards with twenty charts is the wrong default view

At the maximum the results are twenty cards, each with its own Chart.js instance, in a
three-column grid. That is twenty canvases to render and a lot of scrolling to answer "which ones
moved".

**Recommendation:** make a sortable results **table** the default, one row per comparison with
percentages, difference, Z, raw p, adjusted p and a significance marker, sortable by p-value or by
difference. Keep the cards as an optional detail view, or expand a row to reveal its chart. For
crosstab work the table is the deliverable; the charts are for the one or two rows worth showing.

### 5.2 No per-row add or delete

Rows exist only via the count field, which is also the control that currently wipes them. An add
and a delete per row would remove most of the need to touch that field at all.

### 5.3 The comparison count is not clamped

`parseInt(e.target.value) || 1` with no clamp. The label says 1 to 20 and the spinner enforces it,
but typing 200 creates 200 rows.

### 5.4 Bulk import ignores per-row bases

In counts mode the modal converts using `settings.commonSize1/2` even when "same sample size" is
off, and imported items carry no `sampleSize1/2` at all. Those then fall back to
`item.sampleSize1 || 1`, so every imported row is tested on a base of 1 when per-row bases are in
use. Accept four or five columns on paste: name, value 1, value 2, and optionally base 1 and
base 2.

### 5.5 Results do not say what they are

No indication of the alpha used, the direction of the test, or the bases, anywhere in the results
block. The footnote added in the theme pass states the method, but the results themselves should
carry the settings, particularly once a correction is added.

---

## P6. Code quality

- **`tsc -b` reports 5 errors.** All the same one: `sampleSize1` and `sampleSize2` are optional on
  `TestItem`, so `TestResult` inherits them as `number | undefined`, and `ResultCard` passes them
  where a `number` is required. `npm run build` is `vite build` only, so none of this fails the
  build. Make them required on `TestResult`, and add `tsc -b` to the build script.
- **`eslint .` reports 1 error and 2 warnings.** `TestResult` is imported but unused in
  `utils/statistics.ts`; two `useEffect` hooks have missing dependencies, one of which is the cause
  of finding 2.1.
- **`uuid` is an unnecessary dependency.** `crypto.randomUUID()` is built into every browser this
  app supports. Two fewer packages.
- **No tests.** `utils/statistics.ts` and `utils/csv.ts` are pure and small. The cases that matter
  are already written above: 0 versus 0, 100 versus 100, out-of-range input, counts mode display,
  and the correction procedures once they exist.
- **Duplicated statistics.** This app and the single Z-test tool carry two copies of the same
  `erf`, `normalCDF` and `twoProportionZTest`, now with different quality. Share one module.

---

## P7. Accessibility

- **The modal is not a dialog.** No `role="dialog"`, no `aria-modal`, no focus trap, no Escape
  handler, no focus restoration on close, and the background still scrolls. Keyboard users can tab
  straight out of it into the page behind.
- **Table inputs have no accessible names.** Column headers do not name a cell's input to a screen
  reader. Each needs an `aria-label` such as "Group 1 percentage for Awareness".
- **Results are announced to nobody.** The results section appears with no `aria-live` region and
  no focus move.
- **Charts have no text alternative.** Each card needs a hidden table or summary.
- Contrast is now clean throughout. Full table in `docs/THEME-SPEC.md`; the lowest pair is 5.36:1.

---

## P8. Project hygiene

- `package.json` is named `z-test-calculator`, which collides with the sibling app. Rename to
  `multiple-two-proportion-z-test`, version it, and add `typecheck` and `test` scripts.
- `README.md` is the Bolt stub.
- No `netlify.toml`.
- Footer read "© Z-Test Calculator. All rights reserved." It was changed in the theme pass to state
  the method and your name.
- `App.tsx` imported the `Activity` icon without using it. Removed in the theme pass.
- `public/favicon.svg` added in the theme pass, a brand-blue tile with three stacked bars for the
  batch idea.

---

## Order of work, as carried out

1. **2.1 and 2.2**, the data loss. Nothing else mattered while a bulk import threw the data away.
2. **3.1, 3.2 and 2.4**, validation and the NaN and Infinity cases.
3. **3.3 and 3.4**, the counts-mode display and the chart labels.
4. **P1**, the multiple-comparison correction. The headline feature, and the reason the tool is
   worth having.
5. **5.1**, the sortable results table, plus per-row add and delete.
6. **3.5 and P6**, the statistics module lifted from the single Z-test tool, then tests.
7. **P4**, confidence level, intervals, effect size and effective bases, matching the sister tool.
8. **P7 and P8**, accessibility and repo hygiene.

All eight are done. `npm run test` covers the statistics, the corrections and the validation with
32 cases, `npm run lint` and `tsc -b` are clean, and `npm run build` runs the typecheck first.
