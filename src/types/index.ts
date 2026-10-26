/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
export type InputMode = 'percentage' | 'counts';
export type Tails = 1 | 2;
export type Direction = 'greater' | 'less';
export type Correction = 'none' | 'bh' | 'holm';
export type ResultsView = 'table' | 'cards';

/** A row as typed. Every numeric field is a string so it can legitimately be empty. */
export interface RawRow {
  id: string;
  name: string;
  /** Percentage or success count for group 1, depending on inputMode. */
  value1: string;
  value2: string;
  /** Per-row bases. Only used when settings.sameBase is false. */
  base1: string;
  base2: string;
}

export interface Settings {
  inputMode: InputMode;
  /** One base pair for every row. */
  sameBase: boolean;
  commonBase1: string;
  commonBase2: string;
  group1Name: string;
  group2Name: string;
  alpha: number;
  tails: Tails;
  direction: Direction;
  correction: Correction;
  /** Rim-weighted data: divide each base by its group's design effect. */
  weighted: boolean;
  deff1: string;
  deff2: string;
}

/** One parsed, validated comparison, ready to test. */
export interface ParsedRow {
  id: string;
  name: string;
  p1: number;
  p2: number;
  x1: number;
  x2: number;
  n1: number;
  n2: number;
  nEff1: number;
  nEff2: number;
}

export interface Assumption {
  id: string;
  severity: 'warning' | 'note';
  title: string;
  detail: string;
}

export interface RowResult extends ParsedRow {
  zStat: number;
  pValue: number;
  /** p-value after the selected multiple-comparison correction. */
  pAdjusted: number;
  significant: boolean;
  /** Significant before any correction, kept so the two can be compared. */
  significantRaw: boolean;
  pHat: number;
  sePooled: number;
  seUnpooled: number;
  /** Signed difference in percentage points, p1 - p2. */
  differencePP: number;
  ciLowPP: number;
  ciHighPP: number;
  cohensH: number;
  effectLabel: string;
  assumptions: Assumption[];
}

export interface Batch {
  rows: RowResult[];
  settings: Settings;
  zCrit: number;
  zCi: number;
  ciLevel: number;
  significantCount: number;
  significantRawCount: number;
  weighted: boolean;
}

export type FieldErrors = Partial<Record<string, string>>;
