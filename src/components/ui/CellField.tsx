/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
interface CellFieldProps {
  id: string;
  /** Accessible name, since a column header does not name a cell's input. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'number';
  suffix?: string;
  placeholder?: string;
}

export default function CellField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'number',
  suffix,
  placeholder,
}: CellFieldProps) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={type === 'number' ? 'decimal' : 'text'}
          autoComplete="off"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`block w-full rounded-control border bg-white px-3 py-2 text-sm tracking-tight text-ink transition-colors placeholder:text-muted focus:outline-none focus:ring-2 ${
            type === 'number' ? 'tnum' : ''
          } ${suffix ? 'pr-7' : ''} ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-hairline focus:border-brand focus:ring-brand/30'
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-muted">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
