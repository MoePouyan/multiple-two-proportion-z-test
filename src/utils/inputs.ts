/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import type { FieldErrors, InputMode, ParsedRow, RawRow, Settings } from '../types';

export const MAX_ROWS = 50;
export const MIN_ROWS = 1;

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function blankRow(index: number): RawRow {
  return {
    id: newId(),
    name: `Item ${index + 1}`,
    value1: '',
    value2: '',
    base1: '',
    base2: '',
  };
}

export function defaultSettings(): Settings {
  return {
    inputMode: 'percentage',
    sameBase: true,
    commonBase1: '400',
    commonBase2: '400',
    group1Name: 'Group 1',
    group2Name: 'Group 2',
    alpha: 0.05,
    tails: 2,
    direction: 'greater',
    correction: 'bh',
    weighted: false,
    deff1: '1.00',
    deff2: '1.00',
  };
}

export function defaultRows(count = 3): RawRow[] {
  return Array.from({ length: count }, (_, i) => blankRow(i));
}

/** parseFloat that refuses blanks, stray text and non-finite values. */
function num(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rowKey(id: string, field: keyof RawRow): string {
  return `row.${id}.${field}`;
}

function validateSettings(settings: Settings, errors: FieldErrors) {
  if (settings.sameBase) {
    (['commonBase1', 'commonBase2'] as const).forEach((field) => {
      const value = num(settings[field]);
      if (value === null) errors[`settings.${field}`] = 'Enter a sample size.';
      else if (value < 1) errors[`settings.${field}`] = 'Sample size must be at least 1.';
      else if (value > 10_000_000) errors[`settings.${field}`] = 'Sample size looks too large.';
    });
  }

  if (settings.weighted) {
    (['deff1', 'deff2'] as const).forEach((field) => {
      const value = num(settings[field]);
      if (value === null) errors[`settings.${field}`] = 'Enter a design effect.';
      else if (value < 1) errors[`settings.${field}`] = 'Design effect must be at least 1.00.';
      else if (value > 20) errors[`settings.${field}`] = 'Design effect looks too large.';
    });
  }
}

export interface Parsed {
  errors: FieldErrors;
  rows: ParsedRow[] | null;
}

export function validate(rows: RawRow[], settings: Settings): Parsed {
  const errors: FieldErrors = {};
  validateSettings(settings, errors);

  if (rows.length === 0) errors['rows'] = 'Add at least one comparison.';

  const commonBase1 = num(settings.commonBase1);
  const commonBase2 = num(settings.commonBase2);
  const deff1 = settings.weighted ? num(settings.deff1) : 1;
  const deff2 = settings.weighted ? num(settings.deff2) : 1;

  const parsed: ParsedRow[] = [];

  rows.forEach((row, index) => {
    const label = row.name.trim() || `Item ${index + 1}`;

    let n1: number | null;
    let n2: number | null;

    if (settings.sameBase) {
      n1 = commonBase1;
      n2 = commonBase2;
    } else {
      n1 = num(row.base1);
      n2 = num(row.base2);
      if (n1 === null) errors[rowKey(row.id, 'base1')] = 'Enter a sample size.';
      else if (n1 < 1) errors[rowKey(row.id, 'base1')] = 'Must be at least 1.';
      if (n2 === null) errors[rowKey(row.id, 'base2')] = 'Enter a sample size.';
      else if (n2 < 1) errors[rowKey(row.id, 'base2')] = 'Must be at least 1.';
      if (n1 !== null && n1 < 1) n1 = null;
      if (n2 !== null && n2 < 1) n2 = null;
    }

    const readValue = (
      raw: string,
      base: number | null,
      field: 'value1' | 'value2'
    ): { p: number; x: number } | null => {
      const value = num(raw);
      if (value === null) {
        errors[rowKey(row.id, field)] =
          settings.inputMode === 'percentage' ? 'Enter a percentage.' : 'Enter a count.';
        return null;
      }
      if (settings.inputMode === 'percentage') {
        if (value < 0 || value > 100) {
          errors[rowKey(row.id, field)] = 'Must be between 0 and 100.';
          return null;
        }
        if (base === null) return null;
        return { p: value / 100, x: (value / 100) * base };
      }
      if (value < 0) {
        errors[rowKey(row.id, field)] = 'Cannot be negative.';
        return null;
      }
      if (base === null) return null;
      if (value > base) {
        errors[rowKey(row.id, field)] = 'Cannot exceed the sample size.';
        return null;
      }
      return { p: value / base, x: value };
    };

    const g1 = readValue(row.value1, n1, 'value1');
    const g2 = readValue(row.value2, n2, 'value2');

    if (!g1 || !g2 || n1 === null || n2 === null || deff1 === null || deff2 === null) return;

    parsed.push({
      id: row.id,
      name: label,
      p1: g1.p,
      p2: g2.p,
      x1: g1.x,
      x2: g2.x,
      n1,
      n2,
      nEff1: n1 / deff1,
      nEff2: n2 / deff2,
    });
  });

  if (Object.keys(errors).length > 0 || parsed.length !== rows.length) {
    return { errors, rows: null };
  }
  return { errors, rows: parsed };
}

/**
 * Converts what is already entered when the input mode changes, so a figure
 * never silently changes meaning. Needs a base, so rows without one are left
 * alone.
 */
export function convertRow(row: RawRow, settings: Settings, to: InputMode): RawRow {
  const base = (which: 1 | 2): number | null => {
    const raw = settings.sameBase
      ? which === 1
        ? settings.commonBase1
        : settings.commonBase2
      : which === 1
        ? row.base1
        : row.base2;
    const value = num(raw);
    return value !== null && value >= 1 ? value : null;
  };

  const convert = (raw: string, which: 1 | 2): string => {
    const value = num(raw);
    const b = base(which);
    if (value === null || b === null) return raw;

    if (to === 'counts') {
      if (value < 0 || value > 100) return raw;
      return String(Math.round((value / 100) * b));
    }
    if (value < 0 || value > b) return raw;
    return String(Number(((value / b) * 100).toFixed(2)));
  };

  return { ...row, value1: convert(row.value1, 1), value2: convert(row.value2, 2) };
}

/** True when no comparison has been filled in yet. */
export function isBlank(rows: RawRow[]): boolean {
  return rows.every((r) => r.value1.trim() === '' && r.value2.trim() === '');
}

/* ------------------------------------------------------------------ */
/* Bulk paste                                                          */
/* ------------------------------------------------------------------ */

export interface BulkParseResult {
  rows: RawRow[];
  /** True when the pasted lines carried their own base columns. */
  hasBases: boolean;
}

/**
 * Accepts `name, value1, value2` or `name, value1, value2, base1, base2`.
 * Values are kept as typed and validated with everything else, so a bad paste
 * lands in the table with the offending cells flagged rather than being
 * rejected wholesale.
 */
export function parseBulk(text: string): BulkParseResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (lines.length === 0) throw new Error('Nothing to import.');
  if (lines.length > MAX_ROWS) {
    throw new Error(`That is ${lines.length} rows. The maximum is ${MAX_ROWS}.`);
  }

  let hasBases = false;

  const rows = lines.map((line, index) => {
    const cells = line
      .split(/[,\t;]/)
      .map((cell) => cell.trim().replace(/^["']|["']$/g, ''));

    if (cells.length < 3) {
      throw new Error(
        `Line ${index + 1}: expected at least 3 values (name, value 1, value 2), found ${cells.length}.`
      );
    }

    const [name, value1, value2, base1 = '', base2 = ''] = cells;

    if (num(value1) === null || num(value2) === null) {
      throw new Error(`Line ${index + 1}: "${value1}" and "${value2}" are not both numbers.`);
    }
    if (base1 !== '' || base2 !== '') {
      if (num(base1) === null || num(base2) === null) {
        throw new Error(`Line ${index + 1}: sample sizes must be numbers when supplied.`);
      }
      hasBases = true;
    }

    return {
      id: newId(),
      name: name.trim() || `Item ${index + 1}`,
      value1,
      value2,
      base1,
      base2,
    };
  });

  return { rows, hasBases };
}

/* ------------------------------------------------------------------ */
/* Examples                                                            */
/* ------------------------------------------------------------------ */

export interface Preset {
  id: string;
  label: string;
  description: string;
  apply: () => { rows: RawRow[]; settings: Settings };
}

function rowsFrom(data: [string, string, string][]): RawRow[] {
  return data.map(([name, value1, value2]) => ({
    id: newId(),
    name,
    value1,
    value2,
    base1: '',
    base2: '',
  }));
}

export const PRESETS: Preset[] = [
  {
    id: 'funnel',
    label: 'Brand funnel by region',
    description: 'Five funnel measures across two regional samples, unweighted.',
    apply: () => ({
      settings: { ...defaultSettings(), commonBase1: '400', commonBase2: '700' },
      rows: rowsFrom([
        ['Awareness', '78.0', '74.5'],
        ['Consideration', '45.0', '38.2'],
        ['Preference', '31.5', '29.8'],
        ['Trial', '22.0', '15.4'],
        ['Repeat purchase', '11.5', '10.2'],
      ]),
    }),
  },
  {
    id: 'correction',
    label: 'Why correction matters',
    description:
      'Twelve brand attributes. Six clear p < 0.05 on their own; one survives Benjamini-Hochberg.',
    apply: () => ({
      settings: { ...defaultSettings(), commonBase1: '500', commonBase2: '500' },
      rows: rowsFrom([
        ['Easy to do business with', '62.0', '52.7'],
        ['Trustworthy', '54.0', '46.6'],
        ['Good value', '47.0', '40.0'],
        ['Innovative', '41.0', '34.4'],
        ['Sustainable', '35.0', '28.8'],
        ['Premium quality', '28.0', '22.4'],
        ['Well known', '58.0', '57.0'],
        ['Convenient', '51.0', '50.2'],
        ['Friendly service', '44.0', '43.1'],
        ['Wide range', '39.0', '38.2'],
        ['Reliable', '33.0', '32.4'],
        ['Locally owned', '26.0', '25.5'],
      ]),
    }),
  },
  {
    id: 'weighted',
    label: 'Weighted tracker',
    description: 'Rim-weighted waves tested on effective bases via a design effect per group.',
    apply: () => ({
      settings: {
        ...defaultSettings(),
        commonBase1: '1000',
        commonBase2: '1000',
        group1Name: 'Wave 1',
        group2Name: 'Wave 2',
        weighted: true,
        deff1: '1.28',
        deff2: '1.31',
      },
      rows: rowsFrom([
        ['Overall satisfaction', '38.4', '43.1'],
        ['Likely to recommend', '52.0', '56.8'],
        ['Value for money', '29.6', '30.4'],
      ]),
    }),
  },
];
