/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import type { Batch, RowResult } from '../types';
import { CORRECTION_LABELS } from './statistics';
import { formatBase, formatCount, formatPValue, formatSignedPP } from './format';

/** Attribution line appended to every export. */
export const ATTRIBUTION = 'Generated with the Multiple Two-Proportion Z-Tests Calculator, www.moepouyan.com';

function esc(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function settingsRows(batch: Batch): (string | number)[][] {
  const { settings } = batch;
  const rows: (string | number)[][] = [
    ['Setting', 'Value'],
    ['Test', settings.tails === 2 ? 'Two-tailed' : `One-tailed (${settings.direction})`],
    ['Confidence level', `${batch.ciLevel}%`],
    ['Alpha', settings.alpha],
    ['Multiple-comparison correction', CORRECTION_LABELS[settings.correction]],
    ['Comparisons', batch.rows.length],
    ['Significant (corrected)', batch.significantCount],
    ['Significant (uncorrected)', batch.significantRawCount],
    ['Group 1', settings.group1Name],
    ['Group 2', settings.group2Name],
    ['Input mode', settings.inputMode === 'counts' ? 'Success counts' : 'Percentage'],
  ];

  if (batch.weighted) {
    rows.push(['Design effect, group 1', settings.deff1]);
    rows.push(['Design effect, group 2', settings.deff2]);
  }

  return rows;
}

function tableHeader(batch: Batch): string[] {
  const { settings } = batch;
  const g1 = settings.group1Name;
  const g2 = settings.group2Name;

  const header = [
    'Item',
    `${g1} %`,
    `${g2} %`,
    `${g1} successes`,
    `${g2} successes`,
    `${g1} base`,
    `${g2} base`,
  ];

  if (batch.weighted) header.push(`${g1} effective base`, `${g2} effective base`);

  header.push(
    'Difference (pp)',
    `CI low (pp)`,
    `CI high (pp)`,
    'Z',
    'p',
    `p adjusted (${CORRECTION_LABELS[settings.correction]})`,
    "Cohen's h",
    'Effect size',
    'Significant',
    'Significant uncorrected',
    'Warnings'
  );

  return header;
}

function tableRow(row: RowResult, batch: Batch): (string | number)[] {
  const cells: (string | number)[] = [
    row.name,
    (row.p1 * 100).toFixed(2),
    (row.p2 * 100).toFixed(2),
    formatCount(row.x1),
    formatCount(row.x2),
    Math.round(row.n1),
    Math.round(row.n2),
  ];

  if (batch.weighted) cells.push(Math.round(row.nEff1), Math.round(row.nEff2));

  cells.push(
    row.differencePP.toFixed(2),
    row.ciLowPP.toFixed(2),
    row.ciHighPP.toFixed(2),
    row.zStat.toFixed(4),
    row.pValue.toExponential(6),
    row.pAdjusted.toExponential(6),
    row.cohensH.toFixed(4),
    row.effectLabel,
    row.significant ? 'Yes' : 'No',
    row.significantRaw ? 'Yes' : 'No',
    row.assumptions
      .filter((a) => a.severity === 'warning')
      .map((a) => a.title)
      .join('; ')
  );

  return cells;
}

export function csvText(batch: Batch): string {
  const lines: string[] = [];

  settingsRows(batch).forEach((row) => lines.push(row.map(esc).join(',')));
  lines.push('');
  lines.push(tableHeader(batch).map(esc).join(','));
  batch.rows.forEach((row) => lines.push(tableRow(row, batch).map(esc).join(',')));
  lines.push('');
  lines.push(['Source', ATTRIBUTION].map(esc).join(','));

  return lines.join('\n');
}

/** Tab separated, table only, for pasting straight into a spreadsheet. */
export function tsvText(batch: Batch): string {
  const header = [
    'Item',
    `${batch.settings.group1Name} %`,
    `${batch.settings.group2Name} %`,
    'Difference (pp)',
    `${batch.ciLevel}% CI`,
    'Z',
    'p',
    'p adjusted',
    'Significant',
  ];

  const rows = batch.rows.map((row) => [
    row.name,
    (row.p1 * 100).toFixed(1),
    (row.p2 * 100).toFixed(1),
    formatSignedPP(row.differencePP),
    `${formatSignedPP(row.ciLowPP)} to ${formatSignedPP(row.ciHighPP)}`,
    row.zStat.toFixed(3),
    formatPValue(row.pValue),
    formatPValue(row.pAdjusted),
    row.significant ? 'Yes' : 'No',
  ]);

  return [header, ...rows].map((r) => r.join('\t')).join('\n');
}

/** One-paragraph summary of the batch, for pasting into a report. */
export function summaryText(batch: Batch): string {
  const { settings } = batch;
  const lines = [
    `Multiple two-proportion Z-tests: ${settings.group1Name} vs ${settings.group2Name}`,
    `${batch.rows.length} comparisons, ${settings.tails === 2 ? 'two-tailed' : 'one-tailed'}, ` +
      `${batch.ciLevel}% confidence, correction: ${CORRECTION_LABELS[settings.correction]}`,
    batch.weighted
      ? `Weighted: design effects ${settings.deff1} and ${settings.deff2}, tested on effective bases`
      : '',
    `Significant: ${batch.significantCount} of ${batch.rows.length}` +
      (settings.correction === 'none'
        ? ''
        : ` (${batch.significantRawCount} before correction)`),
    '',
    ...batch.rows.map(
      (row) =>
        `${row.name}: ${(row.p1 * 100).toFixed(1)}% of ${formatBase(row.n1)} vs ` +
        `${(row.p2 * 100).toFixed(1)}% of ${formatBase(row.n2)}, ` +
        `${formatSignedPP(row.differencePP)} pp ` +
        `(${batch.ciLevel}% CI ${formatSignedPP(row.ciLowPP)} to ${formatSignedPP(row.ciHighPP)}), ` +
        `Z = ${row.zStat.toFixed(3)}, p = ${formatPValue(row.pValue)}` +
        (settings.correction === 'none' ? '' : `, adj p = ${formatPValue(row.pAdjusted)}`) +
        `, ${row.significant ? 'significant' : 'not significant'}`
    ),
  ];

  lines.push('', ATTRIBUTION);
  return lines.filter((l) => l !== undefined).join('\n');
}

export function downloadBlob(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(batch: Batch, filename = 'z-test-results.csv'): void {
  downloadBlob(filename, 'text/csv;charset=utf-8', csvText(batch));
}
