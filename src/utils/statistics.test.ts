/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { describe, expect, it } from 'vitest';
import {
  adjustPValues,
  familyWiseErrorRate,
  normalCDF,
  normalSF,
  runBatch,
  zCritical,
} from './statistics';
import {
  convertRow,
  defaultSettings,
  newId,
  parseBulk,
  validate,
} from './inputs';
import type { ParsedRow, RawRow, Settings } from '../types';

function settings(patch: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(), correction: 'none', ...patch };
}

function row(name: string, p1: number, n1: number, p2: number, n2: number, deff = 1): ParsedRow {
  return {
    id: name,
    name,
    p1,
    p2,
    x1: p1 * n1,
    x2: p2 * n2,
    n1,
    n2,
    nEff1: n1 / deff,
    nEff2: n2 / deff,
  };
}

function rawRow(name: string, value1: string, value2: string, base1 = '', base2 = ''): RawRow {
  return { id: newId(), name, value1, value2, base1, base2 };
}

describe('normal distribution helpers', () => {
  it('matches known standard normal values', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 12);
    expect(normalCDF(1)).toBeCloseTo(0.8413447461, 7);
    expect(normalSF(1.959963984540054) * 2).toBeCloseTo(0.05, 7);
  });

  it('stays accurate in the far tail instead of collapsing to zero', () => {
    expect(normalSF(8)).toBeGreaterThan(0);
    expect(normalSF(8)).toBeCloseTo(6.22e-16, 18);
  });

  it('returns the expected critical values', () => {
    expect(zCritical(0.05, 2)).toBeCloseTo(1.96, 2);
    expect(zCritical(0.05, 1)).toBeCloseTo(1.645, 3);
  });

  it('computes the family-wise error rate', () => {
    expect(familyWiseErrorRate(20, 0.05)).toBeCloseTo(0.6415, 4);
    expect(familyWiseErrorRate(1, 0.05)).toBeCloseTo(0.05, 10);
  });
});

describe('runBatch', () => {
  it('reproduces a hand-checked case', () => {
    // 45% of 400 vs 77% of 700. Checked against Python's math.erfc:
    // p̂ = 0.6536363636, SE = 0.0298230169, Z = -10.7299674, p = 7.3622e-27.
    const batch = runBatch([row('A', 0.45, 400, 0.77, 700)], settings());
    const r = batch.rows[0];

    expect(r.pHat).toBeCloseTo(0.6536363636, 9);
    expect(r.sePooled).toBeCloseTo(0.0298230169, 9);
    expect(r.zStat).toBeCloseTo(-10.7299674, 6);
    expect(r.pValue / 7.3622123e-27).toBeCloseTo(1, 5);
    expect(r.significant).toBe(true);
  });

  it('returns Z = 0 and p = 1 when both groups are identical instead of NaN', () => {
    const batch = runBatch(
      [row('all zero', 0, 400, 0, 400), row('all one', 1, 400, 1, 400), row('equal', 0.5, 400, 0.5, 400)],
      settings()
    );

    batch.rows.forEach((r) => {
      expect(Number.isNaN(r.zStat)).toBe(false);
      expect(Number.isNaN(r.pValue)).toBe(false);
      expect(r.zStat).toBe(0);
      expect(r.pValue).toBe(1);
      expect(r.significant).toBe(false);
      expect(r.assumptions.map((a) => a.id)).toContain('identical');
    });
  });

  it('builds a confidence interval from the unpooled standard error', () => {
    const batch = runBatch([row('A', 0.45, 400, 0.77, 700)], settings());
    const r = batch.rows[0];

    expect(r.seUnpooled).not.toBeCloseTo(r.sePooled, 6);
    expect(r.ciLowPP).toBeLessThan(r.differencePP);
    expect(r.ciHighPP).toBeGreaterThan(r.differencePP);
    expect(r.ciHighPP).toBeLessThan(0);
  });

  it('keeps the interval spanning zero when not significant', () => {
    const batch = runBatch([row('A', 0.5, 300, 0.52, 300)], settings());
    const r = batch.rows[0];
    expect(r.significant).toBe(false);
    expect(r.ciLowPP).toBeLessThan(0);
    expect(r.ciHighPP).toBeGreaterThan(0);
  });

  it('halves the two-tailed p-value for a one-tailed test in the observed direction', () => {
    const two = runBatch([row('A', 0.55, 400, 0.48, 400)], settings());
    const one = runBatch(
      [row('A', 0.55, 400, 0.48, 400)],
      settings({ tails: 1, direction: 'greater' })
    );
    expect(one.rows[0].pValue).toBeCloseTo(two.rows[0].pValue / 2, 10);
  });

  it('widens the standard error when a design effect is applied', () => {
    const plain = runBatch([row('A', 0.4, 1000, 0.45, 1000)], settings());
    const weighted = runBatch(
      [row('A', 0.4, 1000, 0.45, 1000, 1.3)],
      settings({ weighted: true, deff1: '1.3', deff2: '1.3' })
    );

    expect(weighted.rows[0].sePooled).toBeGreaterThan(plain.rows[0].sePooled);
    expect(Math.abs(weighted.rows[0].zStat)).toBeLessThan(Math.abs(plain.rows[0].zStat));
    expect(weighted.weighted).toBe(true);
    // Effect size ignores the base, so it must not move.
    expect(weighted.rows[0].cohensH).toBeCloseTo(plain.rows[0].cohensH, 12);
  });

  it('flags the normal approximation when expected counts are below five', () => {
    const batch = runBatch([row('Pilot', 0.04, 25, 0.3, 30)], settings());
    expect(batch.rows[0].assumptions.map((a) => a.id)).toContain('normal-approx');
  });
});

describe('multiple-comparison corrections', () => {
  const ps = [0.001, 0.008, 0.039, 0.041, 0.042, 0.6];

  it('leaves p-values alone when no correction is selected', () => {
    expect(adjustPValues(ps, 'none')).toEqual(ps);
  });

  it('matches R p.adjust for Benjamini-Hochberg', () => {
    // R: p.adjust(c(.001,.008,.039,.041,.042,.6), "BH")
    const expected = [0.006, 0.024, 0.0504, 0.0504, 0.0504, 0.6];
    adjustPValues(ps, 'bh').forEach((value, i) => {
      expect(value).toBeCloseTo(expected[i], 6);
    });
  });

  it('matches R p.adjust for Holm', () => {
    // R: p.adjust(c(.001,.008,.039,.041,.042,.6), "holm")
    const expected = [0.006, 0.04, 0.156, 0.156, 0.156, 0.6];
    adjustPValues(ps, 'holm').forEach((value, i) => {
      expect(value).toBeCloseTo(expected[i], 6);
    });
  });

  it('is monotone and never exceeds 1', () => {
    (['bh', 'holm'] as const).forEach((method) => {
      const adjusted = adjustPValues(ps, method);
      const paired = ps
        .map((p, i) => ({ p, adj: adjusted[i] }))
        .sort((a, b) => a.p - b.p);
      paired.forEach((entry, i) => {
        expect(entry.adj).toBeLessThanOrEqual(1);
        expect(entry.adj).toBeGreaterThanOrEqual(entry.p - 1e-12);
        if (i > 0) expect(entry.adj).toBeGreaterThanOrEqual(paired[i - 1].adj - 1e-12);
      });
    });
  });

  it('is stricter than Benjamini-Hochberg under Holm', () => {
    const bh = adjustPValues(ps, 'bh');
    const holm = adjustPValues(ps, 'holm');
    holm.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(bh[i] - 1e-12));
  });

  it('preserves input order', () => {
    const shuffled = [0.6, 0.001, 0.042];
    const adjusted = adjustPValues(shuffled, 'bh');
    expect(adjusted[1]).toBeLessThan(adjusted[0]);
    expect(adjusted[1]).toBeLessThan(adjusted[2]);
  });

  it('reduces the number of significant rows in a batch', () => {
    // The "why correction matters" example: six comparisons clear p < 0.05 on
    // their own, one survives the correction.
    const pairs: [string, number, number][] = [
      ['Easy to do business with', 0.62, 0.527],
      ['Trustworthy', 0.54, 0.466],
      ['Good value', 0.47, 0.4],
      ['Innovative', 0.41, 0.344],
      ['Sustainable', 0.35, 0.288],
      ['Premium quality', 0.28, 0.224],
      ['Well known', 0.58, 0.57],
      ['Convenient', 0.51, 0.502],
      ['Friendly service', 0.44, 0.431],
      ['Wide range', 0.39, 0.382],
      ['Reliable', 0.33, 0.324],
      ['Locally owned', 0.26, 0.255],
    ];
    const rows = pairs.map(([name, p1, p2]) => row(name, p1, 500, p2, 500));

    const raw = runBatch(rows, settings({ correction: 'none' }));
    const bh = runBatch(rows, settings({ correction: 'bh' }));
    const holm = runBatch(rows, settings({ correction: 'holm' }));

    expect(raw.significantCount).toBe(6);
    expect(bh.significantCount).toBe(1);
    expect(holm.significantCount).toBe(1);
    // The uncorrected count is reported alongside, whatever the correction.
    expect(bh.significantRawCount).toBe(6);
    expect(holm.significantRawCount).toBe(6);
  });
});

describe('validation', () => {
  it('accepts a complete table', () => {
    const { errors, rows } = validate([rawRow('A', '45', '38')], settings());
    expect(errors).toEqual({});
    expect(rows?.[0].p1).toBeCloseTo(0.45, 10);
    expect(rows?.[0].n1).toBe(400);
  });

  it('rejects a sample size of zero rather than substituting 1', () => {
    const { rows, errors } = validate([rawRow('A', '45', '38')], settings({ commonBase1: '0' }));
    expect(rows).toBeNull();
    expect(errors['settings.commonBase1']).toBeTruthy();
  });

  it('rejects an out-of-range percentage rather than producing Infinity', () => {
    const { rows, errors } = validate([rawRow('A', '150', '50')], settings());
    expect(rows).toBeNull();
    expect(Object.values(errors)[0]).toBeTruthy();
  });

  it('rejects a success count above the base', () => {
    const { rows } = validate([rawRow('A', '500', '200')], settings({ inputMode: 'counts' }));
    expect(rows).toBeNull();
  });

  it('treats an empty cell as incomplete, not as zero', () => {
    const { rows, errors } = validate([rawRow('A', '', '38')], settings());
    expect(rows).toBeNull();
    expect(Object.keys(errors).length).toBe(1);
  });

  it('uses per-row bases when the common base is off', () => {
    const { rows } = validate(
      [rawRow('A', '45', '38', '200', '350')],
      settings({ sameBase: false })
    );
    expect(rows?.[0].n1).toBe(200);
    expect(rows?.[0].n2).toBe(350);
  });

  it('divides the base by the design effect', () => {
    const { rows } = validate(
      [rawRow('A', '45', '38')],
      settings({ weighted: true, deff1: '1.25', deff2: '2' })
    );
    expect(rows?.[0].nEff1).toBeCloseTo(320, 6);
    expect(rows?.[0].nEff2).toBeCloseTo(200, 6);
  });
});

describe('mode conversion', () => {
  it('converts a percentage to a success count and back', () => {
    const base = settings();
    const asCounts = convertRow(rawRow('A', '45', '77'), base, 'counts');
    expect(asCounts.value1).toBe('180');
    expect(asCounts.value2).toBe('308');

    const back = convertRow(asCounts, { ...base, inputMode: 'counts' }, 'percentage');
    expect(back.value1).toBe('45');
    expect(back.value2).toBe('77');
  });

  it('agrees on the result whichever mode the data was entered in', () => {
    const pct = validate([rawRow('A', '45', '77')], settings());
    const counts = validate(
      [rawRow('A', '180', '308')],
      settings({ inputMode: 'counts' })
    );

    const a = runBatch(pct.rows!, settings());
    const b = runBatch(counts.rows!, settings({ inputMode: 'counts' }));

    expect(b.rows[0].zStat).toBeCloseTo(a.rows[0].zStat, 10);
    expect(b.rows[0].pValue).toBeCloseTo(a.rows[0].pValue, 30);
  });
});

describe('bulk paste', () => {
  it('reads three columns', () => {
    const { rows, hasBases } = parseBulk('Awareness, 78, 74.5\nTrial, 22, 15.4');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Awareness');
    expect(rows[1].value2).toBe('15.4');
    expect(hasBases).toBe(false);
  });

  it('reads five columns and reports that bases were supplied', () => {
    const { rows, hasBases } = parseBulk('Awareness, 78, 74.5, 400, 700');
    expect(rows[0].base1).toBe('400');
    expect(rows[0].base2).toBe('700');
    expect(hasBases).toBe(true);
  });

  it('accepts tabs and semicolons', () => {
    expect(parseBulk('Awareness\t78\t74.5').rows[0].value1).toBe('78');
    expect(parseBulk('Awareness;78;74.5').rows[0].value1).toBe('78');
  });

  it('rejects short lines and non-numeric values', () => {
    expect(() => parseBulk('Awareness, 78')).toThrow();
    expect(() => parseBulk('Awareness, high, low')).toThrow();
  });

  it('keeps every imported row, whatever the count', () => {
    const text = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}, ${40 + i}, ${35 + i}`).join('\n');
    expect(parseBulk(text).rows).toHaveLength(12);
  });
});
