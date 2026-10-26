/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { useState } from 'react';
import { Check, ClipboardCopy, Download, Info, LayoutGrid, Table2 } from 'lucide-react';
import ResultsTable from './ResultsTable';
import ResultCard from './ResultCard';
import SegmentedControl from './ui/SegmentedControl';
import { CORRECTION_LABELS, familyWiseErrorRate } from '../utils/statistics';
import { downloadCSV, summaryText, tsvText } from '../utils/csv';
import type { Batch, ResultsView } from '../types';

const ACTION =
  'inline-flex min-h-[44px] items-center gap-2 rounded-pill border-2 px-5 text-sm font-medium tracking-tight transition-colors duration-200';
const PRIMARY = `${ACTION} border-brand bg-brand text-white hover:border-brand-hover hover:bg-brand-hover`;
const SECONDARY = `${ACTION} border-brand bg-transparent text-brand hover:bg-brand-tint`;

export default function ResultsSection({ batch }: { batch: Batch }) {
  const [view, setView] = useState<ResultsView>('table');
  const [copied, setCopied] = useState<'table' | 'summary' | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const { settings } = batch;
  const k = batch.rows.length;
  const corrected = settings.correction !== 'none';
  const lost = batch.significantRawCount - batch.significantCount;

  const copy = async (what: 'table' | 'summary') => {
    try {
      await navigator.clipboard.writeText(
        what === 'table' ? tsvText(batch) : summaryText(batch)
      );
      setCopied(what);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 4000);
    }
  };

  return (
    <section className="animate-fadeIn space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tighter text-brand">Results</h2>
          <p className="mt-1 text-sm text-secondary">
            <span className="font-medium text-ink">
              {batch.significantCount} of {k}
            </span>{' '}
            {k === 1 ? 'comparison is' : 'comparisons are'} significant at the {batch.ciLevel}%
            level
            {corrected ? ` after ${CORRECTION_LABELS[settings.correction]}` : ''}.
            {corrected && lost > 0 && (
              <>
                {' '}
                {batch.significantRawCount} would be significant uncorrected, so {lost}{' '}
                {lost === 1 ? 'was' : 'were'} lost to the correction.
              </>
            )}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <SegmentedControl
            name="resultsView"
            legend="Results view"
            hideLegend
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'cards', label: 'Cards' },
            ]}
          />
        </div>
      </div>

      {!corrected && k > 1 && (
        <p className="flex items-start gap-2 rounded-control border border-warning/30 bg-warning/5 p-4 text-sm text-secondary">
          <Info size={18} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden="true" />
          <span>
            <span className="font-medium text-warning">No correction applied.</span> Across {k}{' '}
            comparisons at alpha {settings.alpha}, the chance of at least one false positive is{' '}
            {(familyWiseErrorRate(k, settings.alpha) * 100).toFixed(1)}%. Benjamini-Hochberg
            controls that without giving up much power.
          </span>
        </p>
      )}

      {batch.weighted && (
        <p className="flex items-start gap-2 rounded-control border border-hairline bg-paper p-4 text-sm text-secondary">
          <Info size={18} className="mt-0.5 flex-shrink-0 text-brand" aria-hidden="true" />
          <span>
            <span className="font-medium text-ink">Tested on effective bases.</span> Design effects
            of {settings.deff1} and {settings.deff2} were applied, so every standard error uses the
            effective base rather than the nominal one.
          </span>
        </p>
      )}

      <div className="no-print flex flex-wrap gap-3">
        <button type="button" onClick={() => copy('table')} className={PRIMARY}>
          {copied === 'table' ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Table2 size={18} aria-hidden="true" />
          )}
          {copied === 'table' ? 'Copied' : 'Copy table'}
        </button>
        <button type="button" onClick={() => copy('summary')} className={SECONDARY}>
          {copied === 'summary' ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <ClipboardCopy size={18} aria-hidden="true" />
          )}
          {copied === 'summary' ? 'Copied' : 'Copy summary'}
        </button>
        <button
          type="button"
          onClick={() => downloadCSV(batch)}
          className={SECONDARY}
          aria-label="Download all results as CSV"
        >
          <Download size={18} aria-hidden="true" />
          CSV
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? 'Copied to the clipboard.' : ''}
      </p>

      {copyFailed && (
        <p className="text-sm text-danger">
          The browser blocked clipboard access. Use the CSV download instead.
        </p>
      )}

      {view === 'table' ? (
        <ResultsTable batch={batch} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {batch.rows.map((row) => (
            <ResultCard key={row.id} row={row} batch={batch} />
          ))}
        </div>
      )}

      {view === 'table' && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <LayoutGrid size={14} aria-hidden="true" />
          Switch to Cards for a chart per comparison. Click any column heading to sort.
        </p>
      )}
    </section>
  );
}
