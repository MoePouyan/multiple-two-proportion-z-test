/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import Calculator from './components/Calculator';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Calculator />
      </main>

      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted">
            Pooled two-proportion Z-test per comparison. Confidence intervals use the unpooled
            standard error.
          </p>
          <p className="mt-2 text-center text-sm text-muted">
            &copy; 2026{' '}
            <a
              href="https://www.moepouyan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:text-brand-hover hover:underline"
            >
              Moe Pouyan
            </a>
            . All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
