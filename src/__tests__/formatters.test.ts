import { describe, it, expect } from 'vitest';
import { renderMetricsTable, formatNumber, formatCost, formatDelta, formatCostDelta } from '../formatters/metrics-table';
import { renderUnifiedDiff } from '../formatters/unified';
import { renderInlineDiff } from '../formatters/inline';
import { renderSideBySide } from '../formatters/side-by-side';
import { renderJsonDiff } from '../formatters/json-diff';
import { colorize, shouldUseColor, RED, GREEN, RESET } from '../formatters/colors';
import { DiffMetrics, DiffResult, DiffSegment, JsonChange } from '../types';
import { diff } from '../index';

// ── formatNumber ──

describe('formatNumber', () => {
  it('formats small numbers', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats large numbers with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ── formatCost ──

describe('formatCost', () => {
  it('formats cost with 4 decimal places', () => {
    expect(formatCost(0.0042)).toBe('$0.0042');
  });

  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.0000');
  });

  it('formats larger costs', () => {
    expect(formatCost(1.5)).toBe('$1.5000');
  });
});

// ── formatDelta ──

describe('formatDelta', () => {
  it('formats positive delta', () => {
    expect(formatDelta(42)).toBe('+42');
  });

  it('formats negative delta', () => {
    expect(formatDelta(-10)).toBe('-10');
  });

  it('formats zero delta', () => {
    expect(formatDelta(0)).toBe('0');
  });

  it('includes percentage when provided', () => {
    expect(formatDelta(42, 25)).toBe('+42 (+25%)');
  });

  it('formats negative percentage', () => {
    expect(formatDelta(-10, -20)).toBe('-10 (-20%)');
  });
});

// ── formatCostDelta ──

describe('formatCostDelta', () => {
  it('formats positive cost delta', () => {
    expect(formatCostDelta(0.0018)).toBe('+$0.0018');
  });

  it('formats negative cost delta', () => {
    expect(formatCostDelta(-0.001)).toBe('-$0.0010');
  });
});

// ── colorize ──

describe('colorize', () => {
  it('wraps text in ANSI codes when color is enabled', () => {
    expect(colorize('hello', RED, true)).toBe(`${RED}hello${RESET}`);
  });

  it('returns plain text when color is disabled', () => {
    expect(colorize('hello', RED, false)).toBe('hello');
  });

  it('works with different colors', () => {
    expect(colorize('hello', GREEN, true)).toBe(`${GREEN}hello${RESET}`);
  });
});

// ── shouldUseColor ──

describe('shouldUseColor', () => {
  it('returns override when provided', () => {
    expect(shouldUseColor(true)).toBe(true);
    expect(shouldUseColor(false)).toBe(false);
  });
});

// ── renderMetricsTable ──

describe('renderMetricsTable', () => {
  const baseMetrics: DiffMetrics = {
    tokens: {
      a: { input: 10, output: 50 },
      b: { input: 10, output: 75 },
    },
    similarity: { jaccard: 0.68 },
    length: {
      a: { words: 40, sentences: 3, characters: 200 },
      b: { words: 60, sentences: 5, characters: 300 },
    },
    model: { a: 'gpt-4o', b: 'claude-sonnet' },
  };

  it('renders a table string', () => {
    const table = renderMetricsTable(baseMetrics, 'Output A', 'Output B', false);
    expect(table).toContain('Metric');
    expect(table).toContain('Output A');
    expect(table).toContain('Output B');
    expect(table).toContain('Delta');
  });

  it('includes token counts', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('Output tokens');
    expect(table).toContain('50');
    expect(table).toContain('75');
  });

  it('includes input tokens', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('Input tokens');
  });

  it('includes model names', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('gpt-4o');
    expect(table).toContain('claude-sonnet');
  });

  it('includes similarity', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('Jaccard sim.');
    expect(table).toContain('0.68');
  });

  it('includes length stats', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('Words');
    expect(table).toContain('Sentences');
    expect(table).toContain('Characters');
  });

  it('includes cost when available', () => {
    const metricsWithCost: DiffMetrics = {
      ...baseMetrics,
      cost: { a: 0.0042, b: 0.0060, delta: 0.0018, deltaPercent: 42.86 },
    };
    const table = renderMetricsTable(metricsWithCost, 'A', 'B', false);
    expect(table).toContain('Cost');
    expect(table).toContain('$0.0042');
    expect(table).toContain('$0.0060');
  });

  it('includes latency when available', () => {
    const metricsWithLatency: DiffMetrics = {
      ...baseMetrics,
      latency: { a: 1240, b: 980, delta: -260 },
    };
    const table = renderMetricsTable(metricsWithLatency, 'A', 'B', false);
    expect(table).toContain('Latency');
    expect(table).toContain('ms');
  });

  it('renders with box-drawing characters', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).toContain('┌');
    expect(table).toContain('┐');
    expect(table).toContain('└');
    expect(table).toContain('┘');
    expect(table).toContain('│');
    expect(table).toContain('─');
  });

  it('renders with ANSI colors when enabled', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', true);
    expect(table).toContain('\x1b[');
  });

  it('renders without ANSI codes when color is disabled', () => {
    const table = renderMetricsTable(baseMetrics, 'A', 'B', false);
    expect(table).not.toContain('\x1b[');
  });
});

// ── renderUnifiedDiff ──

describe('renderUnifiedDiff', () => {
  const makeDiffResult = (textA: string, textB: string, model_a?: string, model_b?: string): DiffResult => {
    // using imported diff from ../index
    return diff(
      { text: textA, model: model_a },
      { text: textB, model: model_b },
      { mode: 'unified' },
    );
  };

  it('shows no differences for identical outputs', () => {
    const result = makeDiffResult('hello world', 'hello world');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('no differences');
  });

  it('shows removed lines with - prefix', () => {
    const result = makeDiffResult('line1\nline2', 'line1\nline3');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('- ');
  });

  it('shows added lines with + prefix', () => {
    const result = makeDiffResult('line1\nline2', 'line1\nline3');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('+ ');
  });

  it('includes model names in header', () => {
    const result = makeDiffResult('hello', 'world', 'gpt-4o', 'claude-sonnet');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('gpt-4o');
    expect(output).toContain('claude-sonnet');
  });

  it('uses default labels when no model names', () => {
    const result = makeDiffResult('hello', 'world');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('Output A');
    expect(output).toContain('Output B');
  });

  it('includes hunk headers', () => {
    const result = makeDiffResult('line1\nline2', 'line1\nline3');
    const output = renderUnifiedDiff(result, false);
    expect(output).toContain('@@');
  });
});

// ── renderInlineDiff ──

describe('renderInlineDiff', () => {
  it('renders unchanged text as-is', () => {
    const segments: DiffSegment[] = [{ text: 'hello world', type: 'unchanged' }];
    const output = renderInlineDiff(segments, false);
    expect(output).toBe('hello world');
  });

  it('renders removed text with strikethrough markers', () => {
    const segments: DiffSegment[] = [
      { text: 'hello ', type: 'unchanged' },
      { text: 'old', type: 'removed' },
    ];
    const output = renderInlineDiff(segments, false);
    expect(output).toBe('hello ~~old~~');
  });

  it('renders added text with underline markers', () => {
    const segments: DiffSegment[] = [
      { text: 'hello ', type: 'unchanged' },
      { text: 'new', type: 'added' },
    ];
    const output = renderInlineDiff(segments, false);
    expect(output).toBe('hello __new__');
  });

  it('renders mixed changes', () => {
    const segments: DiffSegment[] = [
      { text: 'hello ', type: 'unchanged' },
      { text: 'old', type: 'removed' },
      { text: 'new', type: 'added' },
      { text: ' world', type: 'unchanged' },
    ];
    const output = renderInlineDiff(segments, false);
    expect(output).toBe('hello ~~old~~__new__ world');
  });

  it('uses ANSI codes when color is enabled', () => {
    const segments: DiffSegment[] = [
      { text: 'removed', type: 'removed' },
      { text: 'added', type: 'added' },
    ];
    const output = renderInlineDiff(segments, true);
    expect(output).toContain('\x1b[');
  });
});

// ── renderSideBySide ──

describe('renderSideBySide', () => {
  const makeDiffResult = (textA: string, textB: string): DiffResult => {
    // using imported diff from ../index
    return diff({ text: textA }, { text: textB }, { mode: 'side-by-side' });
  };

  it('renders two columns', () => {
    const result = makeDiffResult('hello', 'world');
    const output = renderSideBySide(result, false, 80);
    expect(output).toContain('|');
  });

  it('includes column headers', () => {
    const result = makeDiffResult('hello', 'world');
    const output = renderSideBySide(result, false, 80);
    expect(output).toContain('Output A');
    expect(output).toContain('Output B');
  });

  it('includes separator line', () => {
    const result = makeDiffResult('hello', 'world');
    const output = renderSideBySide(result, false, 80);
    expect(output).toContain('─');
  });
});

// ── renderJsonDiff ──

describe('renderJsonDiff', () => {
  it('shows no differences for empty changes', () => {
    const output = renderJsonDiff([], {}, {}, false);
    expect(output).toContain('no JSON differences');
  });

  it('shows added keys', () => {
    const changes: JsonChange[] = [
      { path: 'newKey', type: 'added', after: 'value' },
    ];
    const output = renderJsonDiff(changes, {}, { newKey: 'value' }, false);
    expect(output).toContain('+ newKey');
    expect(output).toContain('"value"');
  });

  it('shows removed keys', () => {
    const changes: JsonChange[] = [
      { path: 'oldKey', type: 'removed', before: 'value' },
    ];
    const output = renderJsonDiff(changes, { oldKey: 'value' }, {}, false);
    expect(output).toContain('- oldKey');
    expect(output).toContain('"value"');
  });

  it('shows changed values', () => {
    const changes: JsonChange[] = [
      { path: 'key', type: 'changed', before: 1, after: 2 },
    ];
    const output = renderJsonDiff(changes, { key: 1 }, { key: 2 }, false);
    expect(output).toContain('- key: 1');
    expect(output).toContain('+ key: 2');
  });

  it('uses ANSI codes when color is enabled', () => {
    const changes: JsonChange[] = [
      { path: 'key', type: 'added', after: 'val' },
    ];
    const output = renderJsonDiff(changes, {}, { key: 'val' }, true);
    expect(output).toContain('\x1b[');
  });
});
