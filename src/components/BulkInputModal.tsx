/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MAX_ROWS, parseBulk } from '../utils/inputs';
import type { RawRow, Settings } from '../types';

interface BulkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: RawRow[], hasBases: boolean) => void;
  settings: Settings;
}

export default function BulkInputModal({
  isOpen,
  onClose,
  onImport,
  settings,
}: BulkInputModalProps) {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape to close, Tab kept inside the dialog, focus returned on close, and
  // the page behind held still while it is open.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    textareaRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, textarea, input, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCounts = settings.inputMode === 'counts';
  const valueLabel = isCounts ? 'Successes' : 'Percentage';

  const placeholder = isCounts
    ? `Awareness, 312, 521\nConsideration, 180, 267\nPreference, 126, 209`
    : `Awareness, 78.0, 74.5\nConsideration, 45.0, 38.2\nPreference, 31.5, 29.8`;

  const handleImport = () => {
    try {
      const { rows, hasBases } = parseBulk(inputText);
      onImport(rows, hasBases);
      setInputText('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-title"
        className="animate-modal flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-card bg-white shadow-cardHover"
      >
        <div className="flex items-center justify-between border-b border-hairline p-5">
          <h2 id="bulk-title" className="font-display text-xl font-bold tracking-tighter text-brand">
            Bulk Data Import
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulk import"
            className="rounded-pill p-2 text-muted transition-colors hover:bg-brand-tint hover:text-brand"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-secondary">
            Paste one comparison per line, separated by commas, tabs or semicolons. Up to {MAX_ROWS}{' '}
            rows.
          </p>

          <div className="mt-3 space-y-2">
            <code className="block rounded-control bg-paper px-3 py-2 text-xs text-ink">
              Name, {valueLabel} 1, {valueLabel} 2
            </code>
            <code className="block rounded-control bg-paper px-3 py-2 text-xs text-ink">
              Name, {valueLabel} 1, {valueLabel} 2, Base 1, Base 2
              <span className="ml-2 text-muted">optional per-row bases</span>
            </code>
          </div>

          <div className="mt-3 rounded-control border border-hairline bg-paper p-3 text-xs text-muted">
            Reading as <span className="font-medium text-ink">{valueLabel.toLowerCase()}</span>,
            matching the input mode.{' '}
            {settings.sameBase
              ? `Rows without their own bases use ${settings.commonBase1 || '?'} and ${settings.commonBase2 || '?'}. Supplying bases switches the tool to per-row bases.`
              : 'Per-row bases are on, so supply a base per row or fill them in afterwards.'}
          </div>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            aria-label="Paste comparison rows"
            className="mt-4 h-48 w-full rounded-control border border-hairline bg-white p-3 font-mono text-sm text-ink transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />

          {error && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-hairline bg-paper p-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-pill px-5 text-sm font-medium tracking-tight text-muted transition-colors duration-200 hover:text-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="min-h-[44px] rounded-pill border-2 border-brand bg-brand px-6 text-sm font-medium tracking-tight text-white transition-colors duration-200 hover:border-brand-hover hover:bg-brand-hover"
          >
            Import data
          </button>
        </div>
      </div>
    </div>
  );
}
