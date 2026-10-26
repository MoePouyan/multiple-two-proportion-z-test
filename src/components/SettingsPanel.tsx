/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { Info } from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl';
import NumberField from './ui/NumberField';
import { CORRECTION_LABELS, CORRECTION_NOTES, familyWiseErrorRate } from '../utils/statistics';
import type { Correction, Direction, FieldErrors, InputMode, Settings, Tails } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  rowCount: number;
  errors: FieldErrors;
  onChange: (patch: Partial<Settings>) => void;
  onModeChange: (mode: InputMode) => void;
}

const TEXT_FIELD =
  'block w-full rounded-control border border-hairline bg-white px-3.5 py-2.5 tracking-tight text-ink transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

export default function SettingsPanel({
  settings,
  rowCount,
  errors,
  onChange,
  onModeChange,
}: SettingsPanelProps) {
  const fwer = familyWiseErrorRate(rowCount, settings.alpha);

  return (
    <div className="space-y-6 rounded-card bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
        <SegmentedControl
          name="inputMode"
          legend="Input mode"
          value={settings.inputMode}
          onChange={onModeChange}
          options={[
            { value: 'percentage', label: 'Percentage' },
            { value: 'counts', label: 'Success counts' },
          ]}
          hint="Switching converts the figures already entered."
        />

        <SegmentedControl
          name="alpha"
          legend="Confidence level"
          value={String(settings.alpha)}
          onChange={(value) => onChange({ alpha: Number(value) })}
          options={[
            { value: '0.1', label: '90%' },
            { value: '0.05', label: '95%' },
            { value: '0.01', label: '99%' },
          ]}
        />

        <SegmentedControl
          name="tails"
          legend="Test direction"
          value={String(settings.tails)}
          onChange={(value) => onChange({ tails: Number(value) as Tails })}
          options={[
            { value: '2', label: 'Two-tailed' },
            { value: '1', label: 'One-tailed' },
          ]}
        />

        {settings.tails === 1 && (
          <SegmentedControl
            name="direction"
            legend="Alternative hypothesis"
            value={settings.direction}
            onChange={(value) => onChange({ direction: value as Direction })}
            options={[
              { value: 'greater', label: `${settings.group1Name} higher` },
              { value: 'less', label: `${settings.group1Name} lower` },
            ]}
            hint="Choose the direction before looking at the data."
          />
        )}
      </div>

      <div className="rounded-control border border-hairline bg-paper p-5">
        <SegmentedControl
          name="correction"
          legend="Multiple-comparison correction"
          value={settings.correction}
          onChange={(value) => onChange({ correction: value as Correction })}
          options={(['bh', 'holm', 'none'] as Correction[]).map((value) => ({
            value,
            label: CORRECTION_LABELS[value],
          }))}
        />
        <p className="mt-3 max-w-3xl text-sm text-secondary">
          {CORRECTION_NOTES[settings.correction]}
        </p>
        {settings.correction === 'none' && rowCount > 1 && (
          <p className="mt-3 flex items-start gap-2 text-sm text-warning">
            <Info size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              With {rowCount} comparisons at alpha {settings.alpha}, the chance of at least one
              false positive is {(fwer * 100).toFixed(1)}%.
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="group1Name"
            className="mb-1.5 block text-sm font-medium tracking-tight text-ink"
          >
            Group 1 name
          </label>
          <input
            id="group1Name"
            type="text"
            autoComplete="off"
            value={settings.group1Name}
            onChange={(e) => onChange({ group1Name: e.target.value })}
            className={TEXT_FIELD}
          />
        </div>
        <div>
          <label
            htmlFor="group2Name"
            className="mb-1.5 block text-sm font-medium tracking-tight text-ink"
          >
            Group 2 name
          </label>
          <input
            id="group2Name"
            type="text"
            autoComplete="off"
            value={settings.group2Name}
            onChange={(e) => onChange({ group2Name: e.target.value })}
            className={TEXT_FIELD}
          />
        </div>
      </div>

      <div className="rounded-control border border-hairline bg-paper p-5">
        <div className="flex items-start gap-3">
          <input
            id="sameBase"
            type="checkbox"
            checked={settings.sameBase}
            onChange={(e) => onChange({ sameBase: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
          />
          <label htmlFor="sameBase" className="text-sm tracking-tight text-ink">
            Each group has the same sample size across all comparisons
            <span className="mt-1 block text-xs text-muted">
              Turn this off to enter a base per row, for example when a question was asked of a
              filtered subgroup.
            </span>
          </label>
        </div>

        {settings.sameBase && (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <NumberField
              id="commonBase1"
              label={`Sample size for ${settings.group1Name}`}
              value={settings.commonBase1}
              onChange={(value) => onChange({ commonBase1: value })}
              error={errors['settings.commonBase1']}
              placeholder="0"
            />
            <NumberField
              id="commonBase2"
              label={`Sample size for ${settings.group2Name}`}
              value={settings.commonBase2}
              onChange={(value) => onChange({ commonBase2: value })}
              error={errors['settings.commonBase2']}
              placeholder="0"
            />
          </div>
        )}
      </div>

      <div className="rounded-control border border-hairline bg-white p-5">
        <div className="flex items-start gap-3">
          <input
            id="weighted"
            type="checkbox"
            checked={settings.weighted}
            onChange={(e) => onChange({ weighted: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
          />
          <div className="flex-1">
            <label
              htmlFor="weighted"
              className="block text-sm font-medium tracking-tight text-ink"
            >
              Data is weighted
            </label>
            <p className="mt-1 text-xs text-muted">
              Rim weighting inflates the variance, so every row tested on its nominal base
              overstates significance. The design effect is a property of the column, so one value
              per group applies to all comparisons. Effective base = base / deff.
            </p>

            {settings.weighted && (
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                <NumberField
                  id="deff1"
                  label={`Design effect for ${settings.group1Name}`}
                  value={settings.deff1}
                  onChange={(value) => onChange({ deff1: value })}
                  error={errors['settings.deff1']}
                  hint="deff = base / effective base. 1.00 means unweighted."
                  placeholder="1.00"
                />
                <NumberField
                  id="deff2"
                  label={`Design effect for ${settings.group2Name}`}
                  value={settings.deff2}
                  onChange={(value) => onChange({ deff2: value })}
                  error={errors['settings.deff2']}
                  hint="deff = base / effective base. 1.00 means unweighted."
                  placeholder="1.00"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
