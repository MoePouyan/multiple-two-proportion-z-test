/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { FileText, Plus, Trash2 } from 'lucide-react';
import CellField from './ui/CellField';
import { MAX_ROWS, MIN_ROWS, rowKey } from '../utils/inputs';
import type { FieldErrors, RawRow, Settings } from '../types';

interface DataTableProps {
  rows: RawRow[];
  settings: Settings;
  errors: FieldErrors;
  onRowChange: (id: string, patch: Partial<RawRow>) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onBulkImport: () => void;
}

const TH =
  'px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-[0.08em] text-white';

export default function DataTable({
  rows,
  settings,
  errors,
  onRowChange,
  onAddRow,
  onDeleteRow,
  onBulkImport,
}: DataTableProps) {
  const { sameBase, group1Name, group2Name, inputMode } = settings;
  const valueLabel = inputMode === 'percentage' ? 'Percentage' : 'Success count';
  const suffix = inputMode === 'percentage' ? '%' : undefined;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tighter text-brand">Enter Data</h2>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? 'comparison' : 'comparisons'}, maximum {MAX_ROWS}.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBulkImport}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-pill border-2 border-brand bg-transparent px-5 text-sm font-medium tracking-tight text-brand transition-colors duration-200 hover:bg-brand-tint"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Bulk import
          </button>
          <button
            type="button"
            onClick={onAddRow}
            disabled={rows.length >= MAX_ROWS}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-pill border-2 border-hairline bg-white px-5 text-sm font-medium tracking-tight text-muted transition-colors duration-200 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hairline disabled:hover:text-muted"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add row
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-hairline bg-white shadow-card">
        <table className="min-w-full">
          <caption className="sr-only">
            One row per comparison. Enter a {valueLabel.toLowerCase()} for {group1Name} and{' '}
            {group2Name}
            {sameBase ? '.' : ', with a sample size for each.'}
          </caption>
          <thead>
            <tr className="bg-brand">
              <th scope="col" className={TH}>
                Item
              </th>
              <th scope="col" className={TH}>
                {group1Name} {valueLabel}
              </th>
              <th scope="col" className={TH}>
                {group2Name} {valueLabel}
              </th>
              {!sameBase && (
                <>
                  <th scope="col" className={TH}>
                    {group1Name} base
                  </th>
                  <th scope="col" className={TH}>
                    {group2Name} base
                  </th>
                </>
              )}
              <th scope="col" className={`${TH} w-12`}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-t border-hairline align-top transition-colors duration-150 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-paper'
                } hover:bg-brand-tint`}
              >
                <td className="px-4 py-3">
                  <CellField
                    id={`${row.id}-name`}
                    label={`Name for comparison ${index + 1}`}
                    type="text"
                    value={row.name}
                    placeholder={`Item ${index + 1}`}
                    onChange={(value) => onRowChange(row.id, { name: value })}
                  />
                </td>
                <td className="px-4 py-3">
                  <CellField
                    id={`${row.id}-value1`}
                    label={`${group1Name} ${valueLabel.toLowerCase()} for ${row.name || `item ${index + 1}`}`}
                    value={row.value1}
                    suffix={suffix}
                    placeholder={inputMode === 'percentage' ? '0.0' : '0'}
                    error={errors[rowKey(row.id, 'value1')]}
                    onChange={(value) => onRowChange(row.id, { value1: value })}
                  />
                </td>
                <td className="px-4 py-3">
                  <CellField
                    id={`${row.id}-value2`}
                    label={`${group2Name} ${valueLabel.toLowerCase()} for ${row.name || `item ${index + 1}`}`}
                    value={row.value2}
                    suffix={suffix}
                    placeholder={inputMode === 'percentage' ? '0.0' : '0'}
                    error={errors[rowKey(row.id, 'value2')]}
                    onChange={(value) => onRowChange(row.id, { value2: value })}
                  />
                </td>
                {!sameBase && (
                  <>
                    <td className="px-4 py-3">
                      <CellField
                        id={`${row.id}-base1`}
                        label={`${group1Name} sample size for ${row.name || `item ${index + 1}`}`}
                        value={row.base1}
                        placeholder="0"
                        error={errors[rowKey(row.id, 'base1')]}
                        onChange={(value) => onRowChange(row.id, { base1: value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CellField
                        id={`${row.id}-base2`}
                        label={`${group2Name} sample size for ${row.name || `item ${index + 1}`}`}
                        value={row.base2}
                        placeholder="0"
                        error={errors[rowKey(row.id, 'base2')]}
                        onChange={(value) => onRowChange(row.id, { base2: value })}
                      />
                    </td>
                  </>
                )}
                <td className="px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    disabled={rows.length <= MIN_ROWS}
                    aria-label={`Remove ${row.name || `item ${index + 1}`}`}
                    className="no-print rounded-pill p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
