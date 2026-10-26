# Multiple Two-Proportion Z-Tests Calculator

Tests a whole banner point in one pass. Enter or paste up to 50 comparisons, run them together,
and get the Z-statistic, p-value, confidence interval and effect size for each, with a
multiple-comparison correction applied across the batch.

Part of the [moepouyan.com](https://www.moepouyan.com) portfolio tool set, and themed to match it.

## Why the correction matters

Running *k* tests at alpha 0.05 with no correction gives a family-wise error rate of
`1 - (1 - 0.05)^k`: 22.6% at 5 comparisons, 40.1% at 10, 64.2% at 20. A tool built to run many
tests at once and label them significant is, uncorrected, a false-positive generator.

Three options, with the raw p-value always shown alongside the adjusted one:

| Method | Controls | Use when |
|---|---|---|
| **Benjamini-Hochberg** (default) | False discovery rate, the expected share of flagged comparisons that are false | Scanning a banner point. Keeps far more power than Bonferroni. |
| **Holm-Bonferroni** | Family-wise error rate, the chance of any false positive | A single false positive is costly. Uniformly more powerful than plain Bonferroni. |
| **None** | Nothing | The comparisons were pre-registered. A warning states the family-wise error rate. |

The bundled "Why correction matters" example makes the point: twelve brand attributes where six
clear p < 0.05 on their own, and one survives Benjamini-Hochberg.

## What it does

- **Up to 50 comparisons**, added a row at a time or pasted in bulk. Bulk paste takes
  `name, value 1, value 2` or `name, value 1, value 2, base 1, base 2`, comma, tab or semicolon
  separated.
- **Two input modes.** Percentages with a base, or success counts with a base. Switching converts
  what is already entered rather than reinterpreting it.
- **Common or per-row bases,** for questions asked of a filtered subgroup.
- **Weighted data.** One design effect per group, applied to every row, so rim-weighted
  percentages are tested on effective bases. `n_eff = base / deff`.
- **Confidence level and direction.** 90 / 95 / 99, one- or two-tailed with an explicit alternative
  hypothesis.
- **Confidence interval and Cohen's h per comparison,** so a significant but trivial gap on a large
  base is visible as such.
- **Assumption checks per row.** Normal approximation validity, very small bases, and identical
  proportions.
- **Two result views.** A sortable table by default, cards with a chart each as an option.
- **Export.** Copy the table as TSV for a spreadsheet, copy a report-ready summary, or download a
  CSV carrying every figure and the settings used.

## Method

Pooled two-proportion Z-test per comparison:

```
p̂  = (p₁·n₁ + p₂·n₂) / (n₁ + n₂)          bases are effective bases when weighting is on
SE = sqrt( p̂(1-p̂)(1/n₁ + 1/n₂) )
Z  = (p₁ - p₂) / SE
```

The confidence interval uses the **unpooled** standard error, since pooling is only justified under
the null hypothesis:

```
SE_unpooled = sqrt( p₁(1-p₁)/n₁ + p₂(1-p₂)/n₂ )
CI          = (p₁ - p₂) ± z(1-α/2) · SE_unpooled
```

Adjusted p-values, both capped at 1 and both monotone, matching R's `p.adjust`:

```
Benjamini-Hochberg   p_adj(i) = min over j >= i of ( k/j · p(j) )
Holm                 p_adj(i) = max over j <= i of ( (k-j+1) · p(j) )
```

Normal tail probabilities come from `erfc` rather than `1 - CDF`, so p-values stay accurate past
Z = 6 instead of collapsing to zero, which matters when a batch is read as a ranked column.

## Running it

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck, then production build to dist/
npm run test       # 32 unit tests over the statistics, corrections and validation
npm run lint
```

React 18 + TypeScript + Vite + Tailwind, Chart.js for the card charts, lucide-react for icons. No
runtime dependencies beyond those.

## Deployment

Deployed to Netlify and embedded on moepouyan.com as an iframe, the same pattern as the other
portfolio tools. `netlify.toml` holds the build command and publish directory.

## Documentation

- `docs/REVIEW.md` — code review and the findings behind the current version.
- `docs/UPGRADE.md` — what changed and why.
- `docs/THEME-SPEC.md` — the moepouyan.com design tokens and how they are applied.
