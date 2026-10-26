/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  name: string;
  legend: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hideLegend?: boolean;
  hint?: string;
}

const SEGMENT =
  'block cursor-pointer select-none rounded-pill px-4 py-1.5 text-center text-sm font-medium tracking-tight text-muted transition-colors duration-200 hover:text-brand peer-checked:bg-brand peer-checked:text-white peer-checked:hover:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[#FFBF47]';

export default function SegmentedControl<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  hideLegend = false,
  hint,
}: SegmentedControlProps<T>) {
  return (
    <fieldset>
      <legend
        className={hideLegend ? 'sr-only' : 'mb-2 text-sm font-medium tracking-tight text-ink'}
      >
        {legend}
      </legend>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-pill border border-hairline bg-paper p-1">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value}>
              <input
                id={id}
                name={name}
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label htmlFor={id} className={SEGMENT}>
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
      {hint && <p className="mt-2 max-w-md text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}
