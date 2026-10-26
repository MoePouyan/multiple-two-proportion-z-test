/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
/** Display helpers. Every figure shown in the UI goes through one of these. */

export function isFractional(value: number): boolean {
  return Math.abs(value - Math.round(value)) > 1e-9;
}

/** Success counts. Percentage mode derives them as p x n, often fractional. */
export function formatCount(value: number): string {
  return isFractional(value) ? value.toFixed(1) : String(Math.round(value));
}

/** p-values. Exponential below 0.0001 so a ranked column stays comparable. */
export function formatPValue(p: number): string {
  if (p === 0) return '< 1e-300';
  if (p >= 0.0001) return p.toFixed(5);
  return p.toExponential(2);
}

export function formatPercent(p: number, decimals = 1): string {
  return `${(p * 100).toFixed(decimals)}%`;
}

/** Percentage-point values, always signed, so direction is never ambiguous. */
export function formatSignedPP(value: number, decimals = 1): string {
  const rounded = value.toFixed(decimals);
  return Number(rounded) > 0 ? `+${rounded}` : rounded;
}

export function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function formatBase(value: number): string {
  return Math.round(value).toLocaleString();
}
