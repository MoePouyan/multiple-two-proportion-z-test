# Upgrade: what changed and why

Version 1.0.0, 20 September 2026. Closes every item in `docs/REVIEW.md`. The theme work is
documented separately in `docs/THEME-SPEC.md`; the tokens are unchanged, the new components carry
them.

---

## 1. Multiple-comparison correction (REVIEW P1)

The headline gap. The app ran *k* tests and flagged each at the raw alpha, so at 20 comparisons a
table where nothing had really moved had a 64.2% chance of showing at least one significant result.

There is now a correction selector with three options, and the raw p-value is always shown next to
the adjusted one:

- **Benjamini-Hochberg**, the default. `p_adj(i) = min over j >= i of (k/j · p(j))`, walked down
  from the largest so the result is monotone. Controls the false discovery rate.
- **Holm-Bonferroni.** `p_adj(i) = max over j <= i of ((k-j+1) · p(j))`, walked up. Controls the
  family-wise error rate, uniformly more powerful than plain Bonferroni.
- **None**, with a warning stating the family-wise error rate for the current *k* and alpha.

Both are capped at 1 and both are unit-tested against R's `p.adjust` output.

The results summary reports the contrast directly, for example "1 of 12 comparisons are significant
at the 95% level after Benjamini-Hochberg. 6 would be significant uncorrected, so 5 were lost to
the correction." Rows that cleared the raw threshold but not the adjusted one carry a **Lost to
correction** marker rather than disappearing into "not significant", so the effect of the
correction is visible row by row.

A bundled example, "Why correction matters", is built around exactly that: twelve brand attributes
where six clear p < 0.05 on their own and one survives.

---

## 2. Data loss (REVIEW P2.1, P2.2)

Both were the same cause: an effect that rebuilt the whole table from defaults whenever the row
count changed.

```ts
useEffect(() => { initializeItems(settings.numComparisons); }, [settings.numComparisons]);
```

The effect is gone. Rows are now ordinary state:

- **Bulk import** replaces the rows in one update, whatever the count. Verified in the browser:
  importing twelve rows keeps twelve rows with their names and figures, where the old build came
  back with twelve untouched defaults.
- **Add row** and a **delete button per row** replace the numeric count field, so the control that
  used to wipe the table no longer exists. The row cap is now 50, up from 20.
- Loading an example or pressing Reset replaces rows and settings together, deliberately.

---

## 3. Mode switching converts instead of reinterpreting (REVIEW P2.3)

`percentage1` used to hold a percentage or a count depending on the mode, with no conversion on
switch, so 200 counts silently became 200%.

Rows now hold `value1` and `value2`, and switching modes converts them using the relevant base:
41% of 500 becomes 205, and back again. Verified in the browser. A row without a usable base is
left untouched rather than mangled.

---

## 4. Validation (REVIEW P2.4, P3.1, P3.2)

Every numeric field holds a string and nothing is ever substituted for what was typed. The old
`parseInt(...) || 1` turned a typed `0` into `1`, and `parseFloat(...) || 0` turned a cleared cell
into `0`, so no field in the app could be cleared and retyped.

Validation lives in `src/utils/inputs.ts` and runs over the whole table. Nothing reaches the test
until it passes:

- Base at least 1, at most 10,000,000.
- Percentage between 0 and 100.
- Success count between 0 and its base.
- Design effect between 1.00 and 20.

Errors stay hidden until the first run, then update live as they are fixed, so an untouched table
is never covered in red. Invalid cells are outlined with a message underneath and the run button
says how many need attention.

Reproduced fixes: a base of 0 is now rejected instead of silently becoming 1; 150% is rejected
instead of producing Z = Infinity and a false "significant".

---

## 5. Identical proportions no longer produce NaN (REVIEW P3.1)

Two rows both at 0%, or both at 100%, made the pooled variance exactly zero and printed
**Z = NaN, p = NaN**. That is not an edge case in crosstab work.

The zero standard error is now handled explicitly: identical proportions return Z = 0 and p = 1,
with a note saying the groups are identical. Verified in the browser across three all-zero rows,
and unit-tested for 0/0, 1/1 and 0.5/0.5.

---

## 6. Counts mode displays the right figures (REVIEW P3.3)

`getDisplayValue` converted a percentage into a count and was applied to data that was already
counts, so 200 and 180 successes on bases of 400 displayed a difference of 80 instead of 20, and
the chart plotted 800 and 720 on a base of 400. The CSV export carried the same inflated figures.

Rows are now parsed once into a canonical `{ p, x, n }`, and every display derives from that. The
function is gone.

---

## 7. Chart labels (REVIEW P3.4)

`labels: [result.name, result.name]` labelled both bars with the item name. The card now receives
the batch and labels the bars with the two group names. The tooltip states the percentage, the
successes, the base, and the effective base when weighting is on.

---

## 8. p-values in the far tail (REVIEW P3.5)

`normalSF` was `1 - normalCDF`, which loses the tail to cancellation and returns exactly 0 past
about Z = 6, and `toFixed(5)` floored everything below 1e-5 to `0.00000`. In a ranked column of
twenty rows that made the smallest p-values indistinguishable.

The module is now the same implementation as the single Two-Proportion Z-Test Calculator: the
upper tail comes from `erfc` directly, and p-values below 0.0001 print in exponential form.

---

## 9. Feature parity with the single-test tool (REVIEW P4)

- **Confidence level.** 90 / 95 / 99, threaded through the critical value, the interval and the
  significance test. Nothing hardcodes 0.05.
- **One- or two-tailed,** with the alternative hypothesis chosen explicitly rather than inferred
  from the observed direction.
- **Confidence interval per comparison,** from the unpooled standard error, in percentage points.
- **Cohen's h per comparison,** with its conventional label.
- **Weighted data.** One design effect per group rather than per row, because the design effect is
  a property of the column, not of the question. It applies to every comparison, including per-row
  bases, and the results state both design effects.
- **Assumption checks per row:** normal approximation validity, very small bases, and identical
  proportions. Flagged rows carry a warning triangle in the table and a panel in the card.

---

## 10. Results presentation (REVIEW P5)

- **A sortable table is now the default view.** One row per comparison with both percentages, the
  signed difference, the interval, Z, raw p, adjusted p and a result marker. Click any heading to
  sort; it defaults to ascending p-value, so the strongest results are at the top. `aria-sort` is
  set on the active column.
- **Cards remain as an optional view** for the one or two comparisons worth showing a chart for.
  Twenty Chart.js instances are no longer the default.
- **Per-row add and delete**, so the row count field is gone entirely.
- **Bulk import accepts per-row bases.** Five columns switch the tool to per-row bases
  automatically. It also accepts tabs and semicolons, so a paste straight out of Excel works.
- **The results state their own settings:** confidence level, correction, design effects, and both
  significant counts.

---

## 11. Export (REVIEW P5.5)

- **Copy table** puts the results on the clipboard as TSV, ready to paste into Excel.
- **Copy summary** puts a report-ready paragraph plus one line per comparison.
- **CSV** carries a settings block and then every figure, including successes, both bases,
  effective bases when weighted, the interval bounds, both p-values, Cohen's h and any warnings.

---

## 12. Code quality (REVIEW P6)

- **`tsc -b` is clean.** The five pre-existing errors came from `sampleSize1/2` being optional;
  parsed rows now carry required numbers. `npm run build` runs the typecheck first, so a type error
  fails the build.
- **`eslint .` is clean.** The unused import and both missing-dependency warnings are gone, one of
  which was the cause of the data-loss bug.
- **`uuid` removed.** `crypto.randomUUID()` with a fallback. Two fewer packages.
- **32 unit tests** over the statistics, the corrections and the validation, including the
  `p.adjust` comparisons, the identical-proportion case, mode-conversion round trips and the bulk
  parser.
- **Vendor chunks split,** so the app chunk invalidates on its own between deploys.

---

## 13. Accessibility (REVIEW P7)

- **The modal is a real dialog:** `role="dialog"`, `aria-modal`, labelled by its title, Escape to
  close, Tab held inside it, focus moved in on open and restored on close, background scroll
  locked, and a click on the backdrop closes it.
- **Every table input has an accessible name,** for example "Group 1 percentage for Awareness",
  since a column header does not name a cell's input.
- **Results are announced** through an `aria-live` region, and the run scrolls them into view.
- **Each card carries a hidden table** giving the same figures as its chart.
- Both data and results tables have captions and `scope` on their headers.

---

## 14. Project hygiene (REVIEW P8)

- `package.json` renamed to `multiple-two-proportion-z-test`, version 1.0.0, with `typecheck`,
  `test` and `test:watch` scripts.
- `README.md` rewritten, including the family-wise error rate table and the correction formulas.
- `netlify.toml` added: build command, SPA redirect, asset caching and a `frame-ancestors` policy
  that keeps the moepouyan.com iframe embed working.
- Footer states the method; `public/favicon.svg` and the unused `Activity` import were handled in
  the theme pass.

---

## 15. Verified

- `npm run test` — 32 passed.
- `npm run lint` — no errors.
- `tsc -b` — no errors.
- `npm run build` — succeeds, no warnings.
- Production bundle driven in headless Chromium through the full flow: opens with no results and
  no error styling; an empty run flags six fields; loading an example fills the table without
  running; Benjamini-Hochberg reports 1 of 12 with 6 uncorrected; switching the correction marks
  the results stale and Re-run reports 6 of 12 with the family-wise warning; sorting works; the
  cards view renders twelve charts; a twelve-row bulk import keeps all twelve rows and their
  values; add and delete change the row count; switching to counts converts 41% of 500 to 205;
  Escape closes the modal; three all-zero rows produce no NaN; and 150% is rejected. No console or
  page errors.
