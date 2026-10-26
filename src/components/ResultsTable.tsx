/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatPValue, formatSignedPP } from '../utils/format';
import type { Batch, RowResult } from '../types';

type SortKey = 'name' | 'p1' | 'p2' | 'differencePP' | 'zStat' | 'pValue' | 'pAdjusted';
type Direction = 'asc' | 'desc';

interface Column {
  key: SortKey | null;
  label: string;
  align: 'left' | 'right';
  numeric?: boolean;
}

const TH_BASE =
  'px-3 py-3 font-display text-xs font-bold uppercase tracking-[0.08em] text-white whitespace-nowrap';

export default function ResultsTable({ batch }: { batch: Batch }) {
  const [sortKey, setSortKey] = useState<SortKey>('pValue');
  const [direction, setDirection] = useState<Direction>('asc');

  const showAdjusted = batch.settings.correction !== 'none';

  const columns: Column[] = [
    { key: 'name', label: 'Item', align: 'left' },
    { key: 'p1', label: `${batch.settings.group1Name} %`, align: 'right', numeric: true },
    { key: 'p2', label: `${batch.settings.group2Name} %`, align: 'right', numeric: true },
    { key: 'differencePP', label: 'Diff (pp)', align: 'right', numeric: true },
    { key: null, label: `${batch.ciLevel}% CI`, align: 'right' },
    { key: 'zStat', label: 'Z', align: 'right', numeric: true },
    { key: 'pValue', label: 'p', align: 'right', numeric: true },
    ...(showAdjusted
      ? [{ key: 'pAdjusted' as SortKey, label: 'Adj p', align: 'right' as const, numeric: true }]
      : []),
    { key: null, label: 'Result', align: 'left' },
  ];

  const sorted = useMemo(() => {
    const rows = [...batch.rows];
    rows.sort((a, b) => {
      let comparison: number;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return direction === 'asc' ? comparison : -comparison;
    });
    return rows;
  }, [batch.rows, sortKey, direction]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection(key === 'name' ? 'asc' : key === 'pValue' || key === 'pAdjusted' ? 'asc' : 'desc');
    }
  };

  const hasWarning = (row: RowResult) => row.assumptions.some((a) => a.severity === 'warning');

  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-white shadow-card">
      <table className="min-w-full">
        <caption className="sr-only">
          Results for every comparison, sorted by {sortKey} {direction}ending.
        </caption>
        <thead>
          <tr className="bg-brand">
            {columns.map((column) => {
              const active = column.key === sortKey;
              const ariaSort = active
                ? direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;

              return (
                <th
                  key={column.label}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`${TH_BASE} ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {column.key ? (
                    <button
                      type="button"
                      onClick={() => toggle(column.key as SortKey)}
                      className={`inline-flex items-center gap-1.5 rounded-pill px-1 py-0.5 transition-opacity hover:opacity-80 ${
                        column.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {column.label}
                      {active ? (
                        direction === 'asc' ? (
                          <ArrowUp size={12} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={12} aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.id}
              className={`border-t border-hairline ${index % 2 === 0 ? 'bg-white' : 'bg-paper'}`}
            >
              <th
                scope="row"
                className="px-3 py-3 text-left text-sm font-medium tracking-tight text-ink"
              >
                <span className="inline-flex items-center gap-1.5">
                  {row.name}
                  {hasWarning(row) && (
                    <AlertTriangle
                      size={14}
                      className="flex-shrink-0 text-warning"
                      aria-label="Assumption warning"
                    />
                  )}
                </span>
              </th>
              <td className="tnum px-3 py-3 text-right text-sm text-secondary">
                {(row.p1 * 100).toFixed(1)}
              </td>
              <td className="tnum px-3 py-3 text-right text-sm text-secondary">
                {(row.p2 * 100).toFixed(1)}
              </td>
              <td
                className={`tnum px-3 py-3 text-right text-sm font-medium ${
                  row.significant ? 'text-brand' : 'text-secondary'
                }`}
              >
                {formatSignedPP(row.differencePP)}
              </td>
              <td className="tnum whitespace-nowrap px-3 py-3 text-right text-xs text-muted">
                {formatSignedPP(row.ciLowPP)} to {formatSignedPP(row.ciHighPP)}
              </td>
              <td className="tnum px-3 py-3 text-right text-sm text-secondary">
                {row.zStat.toFixed(3)}
              </td>
              <td className="tnum px-3 py-3 text-right text-sm text-secondary">
                {formatPValue(row.pValue)}
              </td>
              {showAdjusted && (
                <td
                  className={`tnum px-3 py-3 text-right text-sm ${
                    row.significant ? 'font-medium text-ink' : 'text-secondary'
                  }`}
                >
                  {formatPValue(row.pAdjusted)}
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-3">
                {row.significant ? (
                  <span className="inline-flex items-center rounded-pill border border-success/30 bg-success/5 px-3 py-1 text-xs font-medium tracking-tight text-success">
                    Significant
                  </span>
                ) : row.significantRaw ? (
                  <span className="inline-flex items-center rounded-pill border border-warning/30 bg-warning/5 px-3 py-1 text-xs font-medium tracking-tight text-warning">
                    Lost to correction
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-pill border border-hairline bg-paper px-3 py-1 text-xs font-medium tracking-tight text-muted">
                    Not significant
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
