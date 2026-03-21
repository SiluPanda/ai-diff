import { DiffMetrics } from '../types';
import { colorize, RED, GREEN, CYAN, DIM, BOLD, RESET } from './colors';

/**
 * Format a number with comma separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format a cost value in USD.
 */
export function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

/**
 * Format a delta value with sign and optional percentage.
 */
export function formatDelta(delta: number, percent?: number): string {
  const sign = delta > 0 ? '+' : '';
  let result = `${sign}${formatNumber(delta)}`;
  if (percent !== undefined) {
    result += ` (${sign}${percent.toFixed(0)}%)`;
  }
  return result;
}

/**
 * Format a cost delta.
 */
export function formatCostDelta(delta: number): string {
  if (delta > 0) return `+$${delta.toFixed(4)}`;
  if (delta < 0) return `-$${Math.abs(delta).toFixed(4)}`;
  return `$${delta.toFixed(4)}`;
}

interface TableRow {
  metric: string;
  valueA: string;
  valueB: string;
  delta: string;
}

/**
 * Render a metrics comparison table as a formatted string.
 */
export function renderMetricsTable(
  metrics: DiffMetrics,
  labelA: string,
  labelB: string,
  useColor: boolean = true,
): string {
  const rows: TableRow[] = [];

  // Model
  if (metrics.model) {
    rows.push({
      metric: 'Model',
      valueA: metrics.model.a || '-',
      valueB: metrics.model.b || '-',
      delta: '',
    });
  }

  // Output tokens
  const outA = metrics.tokens.a.output;
  const outB = metrics.tokens.b.output;
  const outDelta = outB - outA;
  const outPercent = outA !== 0 ? (outDelta / outA) * 100 : 0;
  rows.push({
    metric: 'Output tokens',
    valueA: formatNumber(outA),
    valueB: formatNumber(outB),
    delta: formatDelta(outDelta, outPercent),
  });

  // Input tokens
  if (metrics.tokens.a.input !== undefined || metrics.tokens.b.input !== undefined) {
    const inA = metrics.tokens.a.input ?? 0;
    const inB = metrics.tokens.b.input ?? 0;
    const inDelta = inB - inA;
    rows.push({
      metric: 'Input tokens',
      valueA: metrics.tokens.a.input !== undefined ? formatNumber(inA) : '-',
      valueB: metrics.tokens.b.input !== undefined ? formatNumber(inB) : '-',
      delta: inDelta !== 0 ? formatDelta(inDelta) : '0',
    });
  }

  // Cost
  if (metrics.cost) {
    rows.push({
      metric: 'Cost',
      valueA: formatCost(metrics.cost.a),
      valueB: formatCost(metrics.cost.b),
      delta: formatCostDelta(metrics.cost.delta),
    });
  }

  // Latency
  if (metrics.latency) {
    rows.push({
      metric: 'Latency',
      valueA: `${formatNumber(metrics.latency.a)}ms`,
      valueB: `${formatNumber(metrics.latency.b)}ms`,
      delta: `${metrics.latency.delta > 0 ? '+' : ''}${formatNumber(metrics.latency.delta)}ms`,
    });
  }

  // Length stats
  const wA = metrics.length.a.words;
  const wB = metrics.length.b.words;
  const wDelta = wB - wA;
  const wPercent = wA !== 0 ? (wDelta / wA) * 100 : 0;
  rows.push({
    metric: 'Words',
    valueA: formatNumber(wA),
    valueB: formatNumber(wB),
    delta: formatDelta(wDelta, wPercent),
  });

  const sA = metrics.length.a.sentences;
  const sB = metrics.length.b.sentences;
  const sDelta = sB - sA;
  const sPercent = sA !== 0 ? (sDelta / sA) * 100 : 0;
  rows.push({
    metric: 'Sentences',
    valueA: formatNumber(sA),
    valueB: formatNumber(sB),
    delta: formatDelta(sDelta, sPercent),
  });

  const cA = metrics.length.a.characters;
  const cB = metrics.length.b.characters;
  const cDelta = cB - cA;
  const cPercent = cA !== 0 ? (cDelta / cA) * 100 : 0;
  rows.push({
    metric: 'Characters',
    valueA: formatNumber(cA),
    valueB: formatNumber(cB),
    delta: formatDelta(cDelta, cPercent),
  });

  // Similarity
  rows.push({
    metric: 'Jaccard sim.',
    valueA: '',
    valueB: '',
    delta: metrics.similarity.jaccard.toFixed(2),
  });

  if (metrics.similarity.semantic !== undefined) {
    rows.push({
      metric: 'Semantic sim.',
      valueA: '',
      valueB: '',
      delta: metrics.similarity.semantic.toFixed(2),
    });
  }

  // Compute column widths
  const colWidths = {
    metric: Math.max(6, ...rows.map(r => r.metric.length)),
    valueA: Math.max(labelA.length, ...rows.map(r => r.valueA.length)),
    valueB: Math.max(labelB.length, ...rows.map(r => r.valueB.length)),
    delta: Math.max(5, ...rows.map(r => r.delta.length)),
  };

  const pad = (s: string, w: number) => s.padEnd(w);
  const border = (ch: string) => {
    const line = `${ch}${'─'.repeat(colWidths.metric + 2)}${ch}${'─'.repeat(colWidths.valueA + 2)}${ch}${'─'.repeat(colWidths.valueB + 2)}${ch}${'─'.repeat(colWidths.delta + 2)}${ch}`;
    return useColor ? `${DIM}${line}${RESET}` : line;
  };

  const lines: string[] = [];

  // Top border
  lines.push(border('┌').replace(/┌(.*)┌/g, '┌$1┬').replace(/┌/g, '┬').replace(/^┬/, '┌').replace(/┬$/, '┐'));

  // Simplify: just build it properly
  const topBorder = useColor
    ? `${DIM}┌${'─'.repeat(colWidths.metric + 2)}┬${'─'.repeat(colWidths.valueA + 2)}┬${'─'.repeat(colWidths.valueB + 2)}┬${'─'.repeat(colWidths.delta + 2)}┐${RESET}`
    : `┌${'─'.repeat(colWidths.metric + 2)}┬${'─'.repeat(colWidths.valueA + 2)}┬${'─'.repeat(colWidths.valueB + 2)}┬${'─'.repeat(colWidths.delta + 2)}┐`;
  lines[0] = topBorder;

  // Header
  const headerRow = [
    useColor ? `${DIM}│${RESET}` : '│',
    ` ${colorize(pad('Metric', colWidths.metric), BOLD, useColor)} `,
    useColor ? `${DIM}│${RESET}` : '│',
    ` ${colorize(pad(labelA, colWidths.valueA), CYAN, useColor)} `,
    useColor ? `${DIM}│${RESET}` : '│',
    ` ${colorize(pad(labelB, colWidths.valueB), CYAN, useColor)} `,
    useColor ? `${DIM}│${RESET}` : '│',
    ` ${pad('Delta', colWidths.delta)} `,
    useColor ? `${DIM}│${RESET}` : '│',
  ].join('');
  lines.push(headerRow);

  // Header separator
  const sepBorder = useColor
    ? `${DIM}├${'─'.repeat(colWidths.metric + 2)}┼${'─'.repeat(colWidths.valueA + 2)}┼${'─'.repeat(colWidths.valueB + 2)}┼${'─'.repeat(colWidths.delta + 2)}┤${RESET}`
    : `├${'─'.repeat(colWidths.metric + 2)}┼${'─'.repeat(colWidths.valueA + 2)}┼${'─'.repeat(colWidths.valueB + 2)}┼${'─'.repeat(colWidths.delta + 2)}┤`;
  lines.push(sepBorder);

  // Data rows
  for (const row of rows) {
    let deltaStr = pad(row.delta, colWidths.delta);
    // Color deltas: positive values in red (more expensive), negative in green (cheaper)
    if (useColor && row.delta.length > 0) {
      if (row.metric === 'Jaccard sim.' || row.metric === 'Semantic sim.') {
        // No special coloring for similarity
      } else if (row.delta.startsWith('+') && row.delta !== '+0') {
        deltaStr = colorize(deltaStr, RED, useColor);
      } else if (row.delta.startsWith('-')) {
        deltaStr = colorize(deltaStr, GREEN, useColor);
      }
    }

    const dataRow = [
      useColor ? `${DIM}│${RESET}` : '│',
      ` ${pad(row.metric, colWidths.metric)} `,
      useColor ? `${DIM}│${RESET}` : '│',
      ` ${pad(row.valueA, colWidths.valueA)} `,
      useColor ? `${DIM}│${RESET}` : '│',
      ` ${pad(row.valueB, colWidths.valueB)} `,
      useColor ? `${DIM}│${RESET}` : '│',
      ` ${deltaStr} `,
      useColor ? `${DIM}│${RESET}` : '│',
    ].join('');
    lines.push(dataRow);
  }

  // Bottom border
  const bottomBorder = useColor
    ? `${DIM}└${'─'.repeat(colWidths.metric + 2)}┴${'─'.repeat(colWidths.valueA + 2)}┴${'─'.repeat(colWidths.valueB + 2)}┴${'─'.repeat(colWidths.delta + 2)}┘${RESET}`
    : `└${'─'.repeat(colWidths.metric + 2)}┴${'─'.repeat(colWidths.valueA + 2)}┴${'─'.repeat(colWidths.valueB + 2)}┴${'─'.repeat(colWidths.delta + 2)}┘`;
  lines.push(bottomBorder);

  return lines.join('\n');
}
