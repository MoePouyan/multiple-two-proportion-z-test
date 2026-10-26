/*
 * Multiple Two-Proportion Z-Tests Calculator
 * Copyright 2026 Moe Pouyan. All rights reserved.
 * https://www.moepouyan.com
 */
import { useEffect, useRef } from 'react';
import { Chart, type ChartConfiguration, registerables } from 'chart.js';
import { AlertTriangle } from 'lucide-react';
import { formatBase, formatCount, formatPValue, formatSignedPP } from '../utils/format';
import type { Batch, RowResult } from '../types';

Chart.register(...registerables);

/* Site typography and colours for every chart in the app. */
Chart.defaults.font.family = "'Outfit', system-ui, -apple-system, sans-serif";
Chart.defaults.color = '#5B6673';

const SERIES = ['#0047AB', '#18212B'];

interface ResultCardProps {
  row: RowResult;
  batch: Batch;
}

export default function ResultCard({ row, batch }: ResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const { settings } = batch;
  const counts = settings.inputMode === 'counts';
  const g1 = settings.group1Name;
  const g2 = settings.group2Name;

  // In counts mode the bars are the actual successes; in percentage mode they
  // are percentages. Both come from the parsed row, so neither is converted
  // twice.
  const value1 = counts ? row.x1 : row.p1 * 100;
  const value2 = counts ? row.x2 : row.p2 * 100;
  const axisLabel = counts ? 'Successes' : 'Percentage (%)';

  const differenceLabel = counts
    ? `Difference: ${formatCount(row.x1 - row.x2)} successes`
    : `Difference: ${formatSignedPP(row.differencePP)} pp`;

  const warnings = row.assumptions.filter((a) => a.severity === 'warning');

  useEffect(() => {
    chartRef.current?.destroy();
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        // Labelled with the two group names, not the item name.
        labels: [g1, g2],
        datasets: [
          {
            label: axisLabel,
            data: [value1, value2],
            backgroundColor: SERIES,
            borderWidth: 0,
            borderRadius: 6,
            maxBarThickness: 72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#18212B',
            cornerRadius: 12,
            padding: 12,
            displayColors: false,
            titleFont: { family: "'Space Grotesk', system-ui, sans-serif", weight: 'bold' },
            callbacks: {
              label: (context) => {
                const isFirst = context.dataIndex === 0;
                const base = isFirst ? row.n1 : row.n2;
                const nEff = isFirst ? row.nEff1 : row.nEff2;
                const pct = ((isFirst ? row.p1 : row.p2) * 100).toFixed(1);
                const head = counts
                  ? `${formatCount(isFirst ? row.x1 : row.x2)} of ${formatBase(base)} (${pct}%)`
                  : `${pct}% of ${formatBase(base)}`;
                return batch.weighted ? `${head}, effective ${formatBase(nEff)}` : head;
              },
            },
          },
          title: {
            display: true,
            text: differenceLabel,
            color: row.significant ? '#166534' : '#991B1B',
            font: {
              family: "'Space Grotesk', system-ui, sans-serif",
              weight: 'bold',
              size: 14,
            },
            padding: { top: 4, bottom: 12 },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: '#D5D9DF' },
            ticks: { color: '#18212B', font: { size: 12, weight: 500 } },
          },
          y: {
            beginAtZero: true,
            max: counts ? undefined : Math.min(100, Math.max(10, Math.max(value1, value2) * 1.2)),
            grid: { color: 'rgba(0,0,0,0.06)' },
            border: { display: false },
            ticks: { color: '#5B6673' },
            title: { display: true, text: axisLabel, color: '#5B6673' },
          },
        },
        animation: { duration: 600 },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [
    axisLabel,
    batch.weighted,
    counts,
    differenceLabel,
    g1,
    g2,
    row.n1,
    row.n2,
    row.nEff1,
    row.nEff2,
    row.p1,
    row.p2,
    row.significant,
    row.x1,
    row.x2,
    value1,
    value2,
  ]);

  return (
    <div className="animate-fadeIn overflow-hidden rounded-card bg-white shadow-card transition-all duration-500 ease-site hover:-translate-y-1.5 hover:shadow-cardHover">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold tracking-tighter text-brand">{row.name}</h3>
          {row.significant ? (
            <span className="inline-flex flex-shrink-0 items-center rounded-pill border border-success/30 bg-success/5 px-3 py-1 text-xs font-medium tracking-tight text-success">
              Significant
            </span>
          ) : row.significantRaw ? (
            <span className="inline-flex flex-shrink-0 items-center rounded-pill border border-warning/30 bg-warning/5 px-3 py-1 text-xs font-medium tracking-tight text-warning">
              Lost to correction
            </span>
          ) : (
            <span className="inline-flex flex-shrink-0 items-center rounded-pill border border-hairline bg-paper px-3 py-1 text-xs font-medium tracking-tight text-muted">
              Not significant
            </span>
          )}
        </div>

        <dl className="mb-4 grid grid-cols-3 gap-3 rounded-control border border-hairline bg-paper p-4">
          <div>
            <dt className="text-xs text-muted">Z</dt>
            <dd className="tnum mt-0.5 font-display text-base font-bold tracking-tighter text-ink">
              {row.zStat.toFixed(3)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">
              {settings.correction === 'none' ? 'p-value' : 'Adjusted p'}
            </dt>
            <dd className="tnum mt-0.5 font-display text-base font-bold tracking-tighter text-ink">
              {formatPValue(settings.correction === 'none' ? row.pValue : row.pAdjusted)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Difference</dt>
            <dd className="tnum mt-0.5 font-display text-base font-bold tracking-tighter text-brand">
              {counts ? formatCount(row.x1 - row.x2) : `${formatSignedPP(row.differencePP)} pp`}
            </dd>
          </div>
        </dl>

        <p className="mb-4 text-xs text-muted">
          {batch.ciLevel}% CI {formatSignedPP(row.ciLowPP)} to {formatSignedPP(row.ciHighPP)} pp
          &nbsp;&middot;&nbsp; Cohen&apos;s h {row.cohensH.toFixed(3)} ({row.effectLabel})
          {settings.correction !== 'none' && (
            <>
              &nbsp;&middot;&nbsp; raw p {formatPValue(row.pValue)}
            </>
          )}
        </p>

        {warnings.length > 0 && (
          <ul className="mb-4 space-y-2">
            {warnings.map((warning) => (
              <li
                key={warning.id}
                className="flex items-start gap-2 rounded-control border border-warning/30 bg-warning/5 p-3 text-xs text-secondary"
              >
                <AlertTriangle
                  size={14}
                  className="mt-0.5 flex-shrink-0 text-warning"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium text-warning">{warning.title}.</span>{' '}
                  {warning.detail}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="h-64 rounded-control border border-hairline bg-white p-3">
          <canvas ref={canvasRef} />
        </div>

        {/* Text equivalent of the chart. */}
        <table className="sr-only">
          <caption>{row.name}, by group</caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">{axisLabel}</th>
              <th scope="col">Base</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{g1}</th>
              <td>{value1.toFixed(1)}</td>
              <td>{formatBase(row.n1)}</td>
            </tr>
            <tr>
              <th scope="row">{g2}</th>
              <td>{value2.toFixed(1)}</td>
              <td>{formatBase(row.n2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
