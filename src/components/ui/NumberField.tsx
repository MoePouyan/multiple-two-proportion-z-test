/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { AlertCircle } from 'lucide-react';

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  suffix?: string;
  placeholder?: string;
}

/**
 * The value is held as a string so the field can legitimately be empty while
 * it is being retyped. Parsing and range checks happen in utils/inputs.ts, and
 * nothing is ever silently substituted for what was typed.
 */
export default function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  suffix,
  placeholder,
}: NumberFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium tracking-tight text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`tnum block w-full rounded-control border bg-white px-3.5 py-2.5 tracking-tight text-ink transition-colors placeholder:text-muted focus:outline-none focus:ring-2 ${
            suffix ? 'pr-9' : ''
          } ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-hairline focus:border-brand focus:ring-brand/30'
          }`}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <span className="text-sm text-muted">{suffix}</span>
          </div>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle size={14} className="mt-px flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
