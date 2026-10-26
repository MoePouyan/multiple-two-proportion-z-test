/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import type {
  Assumption,
  Batch,
  Correction,
  ParsedRow,
  RowResult,
  Settings,
  Tails,
} from '../types';

/* -------------------------------------------------------------------------
   Two-proportion Z-test, batched, with multiple-comparison control.

   This module is the same implementation as the single Two-Proportion Z-Test
   Calculator, extended with the correction procedures. Tail probabilities come
   from erfc rather than 1 - CDF, so p-values stay accurate far out instead of
   collapsing to exactly 0 around Z = 6, which matters here because a batch is
   read as a ranked column of p-values.
   ------------------------------------------------------------------------- */

/**
 * Complementary error function. Chebyshev approximation from Numerical
 * Recipes (3rd ed., 6.2.2). Fractional error below 1.2e-7 across the whole
 * range, and it does not lose precision in the tail.
 */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;

  const cof = [
    -1.3026537197817094, 6.419697923564902e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11,
    2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15,
  ];

  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }

  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

export function erf(x: number): number {
  return 1 - erfc(x);
}

/** Standard normal cumulative distribution function, P(Z <= x). */
export function normalCDF(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2);
}

/** Standard normal survival function, P(Z > x). Accurate in the far tail. */
export function normalSF(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

const Z_TWO_TAILED: Record<string, number> = {
  '0.1': 1.6448536269514722,
  '0.05': 1.959963984540054,
  '0.01': 2.5758293035489004,
};

const Z_ONE_TAILED: Record<string, number> = {
  '0.1': 1.2815515655446004,
  '0.05': 1.6448536269514722,
  '0.01': 2.3263478740408408,
};

export function zCritical(alpha: number, tails: Tails): number {
  const table = tails === 2 ? Z_TWO_TAILED : Z_ONE_TAILED;
  return table[String(alpha)] ?? Z_TWO_TAILED['0.05'];
}

/** Two-sided critical value, used for the confidence interval at any alpha. */
export function zTwoSided(alpha: number): number {
  return Z_TWO_TAILED[String(alpha)] ?? Z_TWO_TAILED['0.05'];
}

function effectSizeLabel(h: number): string {
  const a = Math.abs(h);
  if (a < 0.2) return 'negligible';
  if (a < 0.5) return 'small';
  if (a < 0.8) return 'medium';
  return 'large';
}

/* ------------------------------------------------------------------ */
/* Multiple-comparison corrections                                     */
/* ------------------------------------------------------------------ */

export const CORRECTION_LABELS: Record<Correction, string> = {
  none: 'None',
  bh: 'Benjamini-Hochberg',
  holm: 'Holm-Bonferroni',
};

export const CORRECTION_NOTES: Record<Correction, string> = {
  none: 'Every comparison tested at the raw alpha. With k tests the chance of at least one false positive is 1 - (1 - alpha)^k.',
  bh: 'Controls the false discovery rate: the expected share of flagged comparisons that are false positives. The usual choice for a banner point.',
  holm: 'Controls the family-wise error rate: the chance of any false positive at all. Stricter than Benjamini-Hochberg, uniformly more powerful than plain Bonferroni.',
};

/**
 * Adjusted p-values for a batch. Order of the returned array matches the input.
 *
 * Benjamini-Hochberg: p_adj(i) = min over j >= i of ( k / j * p(j) ), walking
 * down from the largest so the result is monotone.
 *
 * Holm: p_adj(i) = max over j <= i of ( (k - j + 1) * p(j) ), walking up.
 *
 * Both are capped at 1. A comparison is significant when its adjusted p-value
 * is below alpha, which is equivalent to the usual step-up / step-down
 * formulations and is easier to display.
 */
export function adjustPValues(pValues: number[], method: Correction): number[] {
  const k = pValues.length;
  if (k === 0) return [];
  if (method === 'none') return pValues.slice();

  const order = pValues
    .map((p, index) => ({ p, index }))
    .sort((a, b) => a.p - b.p);

  const adjusted = new Array<number>(k);

  if (method === 'bh') {
    let running = 1;
    for (let rank = k; rank >= 1; rank--) {
      const { p, index } = order[rank - 1];
      running = Math.min(running, (k / rank) * p);
      adjusted[index] = Math.min(1, running);
    }
  } else {
    let running = 0;
    for (let rank = 1; rank <= k; rank++) {
      const { p, index } = order[rank - 1];
      running = Math.max(running, (k - rank + 1) * p);
      adjusted[index] = Math.min(1, running);
    }
  }

  return adjusted;
}

/** Chance of at least one false positive across k independent tests. */
export function familyWiseErrorRate(k: number, alpha: number): number {
  return 1 - Math.pow(1 - alpha, k);
}

/* ------------------------------------------------------------------ */
/* The test                                                            */
/* ------------------------------------------------------------------ */

function rowAssumptions(row: ParsedRow, weighted: boolean): Assumption[] {
  const out: Assumption[] = [];

  const groups = [
    { p: row.p1, nEff: row.nEff1, which: 1 },
    { p: row.p2, nEff: row.nEff2, which: 2 },
  ];

  const failing = groups.filter((g) => g.nEff * g.p < 5 || g.nEff * (1 - g.p) < 5);

  if (failing.length > 0) {
    out.push({
      id: 'normal-approx',
      severity: 'warning',
      title: 'Normal approximation may not hold',
      detail:
        'Fewer than 5 expected successes or failures (n x p and n x (1 - p) should both be at ' +
        "least 5). Use Fisher's exact test for this comparison.",
    });
  }

  const small = groups.filter((g) => g.nEff < 30);
  if (small.length > 0 && failing.length === 0) {
    out.push({
      id: 'small-base',
      severity: 'warning',
      title: 'Very small base',
      detail: `Tested on fewer than 30 cases${weighted ? ' after weighting' : ''}. Indicative only.`,
    });
  }

  if (row.p1 === row.p2) {
    out.push({
      id: 'identical',
      severity: 'note',
      title: 'Identical proportions',
      detail: 'Both groups are at the same value, so there is nothing to test. Z = 0, p = 1.',
    });
  }

  return out;
}

function testRow(row: ParsedRow, settings: Settings, zCi: number, weighted: boolean) {
  const pHat =
    (row.p1 * row.nEff1 + row.p2 * row.nEff2) / (row.nEff1 + row.nEff2);

  const sePooled = Math.sqrt(pHat * (1 - pHat) * (1 / row.nEff1 + 1 / row.nEff2));

  const seUnpooled = Math.sqrt(
    (row.p1 * (1 - row.p1)) / row.nEff1 + (row.p2 * (1 - row.p2)) / row.nEff2
  );

  // Both proportions at 0 or both at 1 make the pooled variance exactly zero.
  // That is not an error, it is two identical groups: Z = 0, p = 1.
  const degenerate = sePooled === 0 || !Number.isFinite(sePooled);
  const zStat = degenerate ? 0 : (row.p1 - row.p2) / sePooled;

  let pValue: number;
  if (degenerate) {
    pValue = 1;
  } else if (settings.tails === 2) {
    pValue = 2 * normalSF(Math.abs(zStat));
  } else if (settings.direction === 'greater') {
    pValue = normalSF(zStat);
  } else {
    pValue = normalCDF(zStat);
  }
  pValue = Math.min(1, Math.max(0, pValue));

  const differencePP = (row.p1 - row.p2) * 100;
  const marginPP = zCi * seUnpooled * 100;
  const cohensH = 2 * Math.asin(Math.sqrt(row.p1)) - 2 * Math.asin(Math.sqrt(row.p2));

  return {
    zStat,
    pValue,
    pHat,
    sePooled,
    seUnpooled,
    differencePP,
    ciLowPP: differencePP - marginPP,
    ciHighPP: differencePP + marginPP,
    cohensH,
    effectLabel: effectSizeLabel(cohensH),
    assumptions: rowAssumptions(row, weighted),
  };
}

export function runBatch(rows: ParsedRow[], settings: Settings): Batch {
  const zCi = zTwoSided(settings.alpha);
  const weighted =
    settings.weighted &&
    rows.some((r) => Math.abs(r.n1 - r.nEff1) > 1e-9 || Math.abs(r.n2 - r.nEff2) > 1e-9);

  const tested = rows.map((row) => ({ row, stats: testRow(row, settings, zCi, weighted) }));
  const adjusted = adjustPValues(
    tested.map((t) => t.stats.pValue),
    settings.correction
  );

  const results: RowResult[] = tested.map(({ row, stats }, i) => ({
    ...row,
    ...stats,
    pAdjusted: adjusted[i],
    significant: adjusted[i] < settings.alpha,
    significantRaw: stats.pValue < settings.alpha,
  }));

  return {
    rows: results,
    settings,
    zCrit: zCritical(settings.alpha, settings.tails),
    zCi,
    ciLevel: Math.round((1 - settings.alpha) * 100),
    significantCount: results.filter((r) => r.significant).length,
    significantRawCount: results.filter((r) => r.significantRaw).length,
    weighted,
  };
}
