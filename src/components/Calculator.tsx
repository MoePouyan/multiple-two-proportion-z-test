/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Play, RefreshCw, RotateCcw } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import DataTable from './DataTable';
import BulkInputModal from './BulkInputModal';
import ResultsSection from './ResultsSection';
import { runBatch } from '../utils/statistics';
import {
  MAX_ROWS,
  MIN_ROWS,
  PRESETS,
  blankRow,
  convertRow,
  defaultRows,
  defaultSettings,
  isBlank,
  validate,
} from '../utils/inputs';
import type { Batch, FieldErrors, InputMode, RawRow, Settings } from '../types';

interface Snapshot {
  batch: Batch;
  key: string;
}

const NO_ERRORS: FieldErrors = {};

export default function Calculator() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [rows, setRows] = useState<RawRow[]>(() => defaultRows(3));
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isBulkOpen, setBulkOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const { errors, rows: parsed } = useMemo(() => validate(rows, settings), [rows, settings]);

  // Errors stay hidden until the first run, then update live as they are
  // fixed, so an untouched table is never covered in red.
  const visibleErrors = attempted ? errors : NO_ERRORS;

  const stateKey = JSON.stringify({ rows, settings });
  const stale = snapshot !== null && snapshot.key !== stateKey;
  const errorCount = Object.keys(errors).length;

  const handleRun = () => {
    setAttempted(true);
    if (!parsed) return;
    window.umami?.track('calculation_run', { tool: 'multiple-z-test', comparisons: parsed.length });
    setSnapshot({ batch: runBatch(parsed, settings), key: stateKey });
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSettingsChange = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleModeChange = (mode: InputMode) => {
    if (mode === settings.inputMode) return;
    setRows((prev) => prev.map((row) => convertRow(row, settings, mode)));
    setSettings((prev) => ({ ...prev, inputMode: mode }));
  };

  const handleRowChange = (id: string, patch: Partial<RawRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, blankRow(prev.length)]));
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => (prev.length <= MIN_ROWS ? prev : prev.filter((row) => row.id !== id)));
  };

  /**
   * Imported rows replace the table in one update. The old build set a row
   * count and let an effect rebuild the table from defaults, which threw the
   * imported data away whenever the count changed.
   */
  const handleImport = (imported: RawRow[], hasBases: boolean) => {
    setRows(imported);
    if (hasBases) setSettings((prev) => ({ ...prev, sameBase: false }));
    setSnapshot(null);
    setAttempted(false);
  };

  const handlePreset = (apply: () => { rows: RawRow[]; settings: Settings }) => {
    const next = apply();
    setRows(next.rows);
    setSettings(next.settings);
    setSnapshot(null);
    setAttempted(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings());
    setRows(defaultRows(3));
    setSnapshot(null);
    setAttempted(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <p className="mb-3 inline-flex items-center rounded-pill border border-hairline bg-white px-4 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Batch significance testing
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tighter text-brand sm:text-4xl">
          Multiple Two-Proportion Z-Tests Calculator
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-secondary">
          Test a whole banner point in one pass, with the multiple-comparison correction that makes
          a batch of tests trustworthy. Weighted bases, confidence intervals and assumption checks
          included.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-xl font-bold tracking-tighter text-brand">Settings</h2>
        <SettingsPanel
          settings={settings}
          rowCount={rows.length}
          errors={visibleErrors}
          onChange={handleSettingsChange}
          onModeChange={handleModeChange}
        />
      </section>

      <section className="mb-8">
        <DataTable
          rows={rows}
          settings={settings}
          errors={visibleErrors}
          onRowChange={handleRowChange}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onBulkImport={() => setBulkOpen(true)}
        />
      </section>

      <div className="no-print mb-6">
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-pill border-2 border-brand bg-brand px-7 font-medium tracking-tight text-white transition-colors duration-200 hover:border-brand-hover hover:bg-brand-hover"
          >
            {stale ? (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {stale ? 'Re-run tests' : 'Run multiple two-proportion Z-tests'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-pill border-2 border-hairline bg-white px-6 font-medium tracking-tight text-muted transition-colors duration-200 hover:border-brand hover:text-brand"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>

        {attempted && errorCount > 0 && (
          <p className="mt-3 flex items-start justify-center gap-2 text-sm text-danger" role="alert">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {errorCount === 1
                ? 'One field needs attention before the tests can run.'
                : `${errorCount} fields need attention before the tests can run.`}
            </span>
          </p>
        )}

        <div className="mt-6 border-t border-hairline pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm font-medium tracking-tight text-ink">Load an example</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset.apply)}
                title={preset.description}
                className="min-h-[40px] rounded-pill border border-hairline bg-white px-4 text-sm font-medium tracking-tight text-brand transition-colors duration-200 hover:border-brand hover:bg-brand-tint"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Examples fill the table only. Select Run to test them.
          </p>
        </div>
      </div>

      <div ref={resultsRef} aria-live="polite">
        {snapshot ? (
          <>
            {stale && (
              <p className="no-print mb-4 flex items-start gap-3 rounded-control border border-warning/30 bg-warning/5 p-4">
                <RefreshCw
                  size={18}
                  className="mt-0.5 flex-shrink-0 text-warning"
                  aria-hidden="true"
                />
                <span className="text-sm text-secondary">
                  <span className="font-medium text-warning">Inputs have changed.</span> These
                  results are from the previous run. Select Re-run tests to update them.
                </span>
              </p>
            )}
            <div className={stale ? 'opacity-50 transition-opacity duration-300' : ''}>
              <ResultsSection batch={snapshot.batch} />
            </div>
          </>
        ) : (
          <section className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center">
            <Play className="mx-auto mb-3 h-6 w-6 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">
              {attempted && errorCount > 0
                ? `Results will appear once the ${errorCount === 1 ? 'highlighted field is' : 'highlighted fields are'} corrected and you run the tests.`
                : isBlank(rows)
                  ? 'Fill in the table, or load an example, then run the tests.'
                  : 'Select Run to test these comparisons.'}
            </p>
          </section>
        )}
      </div>

      <BulkInputModal
        isOpen={isBulkOpen}
        onClose={() => setBulkOpen(false)}
        onImport={handleImport}
        settings={settings}
      />
    </div>
  );
}
