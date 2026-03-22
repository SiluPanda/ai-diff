"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_table_1 = require("../formatters/metrics-table");
const unified_1 = require("../formatters/unified");
const inline_1 = require("../formatters/inline");
const side_by_side_1 = require("../formatters/side-by-side");
const json_diff_1 = require("../formatters/json-diff");
const colors_1 = require("../formatters/colors");
const index_1 = require("../index");
// ── formatNumber ──
(0, vitest_1.describe)('formatNumber', () => {
    (0, vitest_1.it)('formats small numbers', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatNumber)(42)).toBe('42');
    });
    (0, vitest_1.it)('formats large numbers with commas', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatNumber)(1234567)).toBe('1,234,567');
    });
    (0, vitest_1.it)('formats zero', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatNumber)(0)).toBe('0');
    });
});
// ── formatCost ──
(0, vitest_1.describe)('formatCost', () => {
    (0, vitest_1.it)('formats cost with 4 decimal places', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatCost)(0.0042)).toBe('$0.0042');
    });
    (0, vitest_1.it)('formats zero cost', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatCost)(0)).toBe('$0.0000');
    });
    (0, vitest_1.it)('formats larger costs', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatCost)(1.5)).toBe('$1.5000');
    });
});
// ── formatDelta ──
(0, vitest_1.describe)('formatDelta', () => {
    (0, vitest_1.it)('formats positive delta', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatDelta)(42)).toBe('+42');
    });
    (0, vitest_1.it)('formats negative delta', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatDelta)(-10)).toBe('-10');
    });
    (0, vitest_1.it)('formats zero delta', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatDelta)(0)).toBe('0');
    });
    (0, vitest_1.it)('includes percentage when provided', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatDelta)(42, 25)).toBe('+42 (+25%)');
    });
    (0, vitest_1.it)('formats negative percentage', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatDelta)(-10, -20)).toBe('-10 (-20%)');
    });
});
// ── formatCostDelta ──
(0, vitest_1.describe)('formatCostDelta', () => {
    (0, vitest_1.it)('formats positive cost delta', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatCostDelta)(0.0018)).toBe('+$0.0018');
    });
    (0, vitest_1.it)('formats negative cost delta', () => {
        (0, vitest_1.expect)((0, metrics_table_1.formatCostDelta)(-0.001)).toBe('-$0.0010');
    });
});
// ── colorize ──
(0, vitest_1.describe)('colorize', () => {
    (0, vitest_1.it)('wraps text in ANSI codes when color is enabled', () => {
        (0, vitest_1.expect)((0, colors_1.colorize)('hello', colors_1.RED, true)).toBe(`${colors_1.RED}hello${colors_1.RESET}`);
    });
    (0, vitest_1.it)('returns plain text when color is disabled', () => {
        (0, vitest_1.expect)((0, colors_1.colorize)('hello', colors_1.RED, false)).toBe('hello');
    });
    (0, vitest_1.it)('works with different colors', () => {
        (0, vitest_1.expect)((0, colors_1.colorize)('hello', colors_1.GREEN, true)).toBe(`${colors_1.GREEN}hello${colors_1.RESET}`);
    });
});
// ── shouldUseColor ──
(0, vitest_1.describe)('shouldUseColor', () => {
    (0, vitest_1.it)('returns override when provided', () => {
        (0, vitest_1.expect)((0, colors_1.shouldUseColor)(true)).toBe(true);
        (0, vitest_1.expect)((0, colors_1.shouldUseColor)(false)).toBe(false);
    });
});
// ── renderMetricsTable ──
(0, vitest_1.describe)('renderMetricsTable', () => {
    const baseMetrics = {
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
    (0, vitest_1.it)('renders a table string', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'Output A', 'Output B', false);
        (0, vitest_1.expect)(table).toContain('Metric');
        (0, vitest_1.expect)(table).toContain('Output A');
        (0, vitest_1.expect)(table).toContain('Output B');
        (0, vitest_1.expect)(table).toContain('Delta');
    });
    (0, vitest_1.it)('includes token counts', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Output tokens');
        (0, vitest_1.expect)(table).toContain('50');
        (0, vitest_1.expect)(table).toContain('75');
    });
    (0, vitest_1.it)('includes input tokens', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Input tokens');
    });
    (0, vitest_1.it)('includes model names', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('gpt-4o');
        (0, vitest_1.expect)(table).toContain('claude-sonnet');
    });
    (0, vitest_1.it)('includes similarity', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Jaccard sim.');
        (0, vitest_1.expect)(table).toContain('0.68');
    });
    (0, vitest_1.it)('includes length stats', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Words');
        (0, vitest_1.expect)(table).toContain('Sentences');
        (0, vitest_1.expect)(table).toContain('Characters');
    });
    (0, vitest_1.it)('includes cost when available', () => {
        const metricsWithCost = {
            ...baseMetrics,
            cost: { a: 0.0042, b: 0.0060, delta: 0.0018, deltaPercent: 42.86 },
        };
        const table = (0, metrics_table_1.renderMetricsTable)(metricsWithCost, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Cost');
        (0, vitest_1.expect)(table).toContain('$0.0042');
        (0, vitest_1.expect)(table).toContain('$0.0060');
    });
    (0, vitest_1.it)('includes latency when available', () => {
        const metricsWithLatency = {
            ...baseMetrics,
            latency: { a: 1240, b: 980, delta: -260 },
        };
        const table = (0, metrics_table_1.renderMetricsTable)(metricsWithLatency, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('Latency');
        (0, vitest_1.expect)(table).toContain('ms');
    });
    (0, vitest_1.it)('renders with box-drawing characters', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).toContain('┌');
        (0, vitest_1.expect)(table).toContain('┐');
        (0, vitest_1.expect)(table).toContain('└');
        (0, vitest_1.expect)(table).toContain('┘');
        (0, vitest_1.expect)(table).toContain('│');
        (0, vitest_1.expect)(table).toContain('─');
    });
    (0, vitest_1.it)('renders with ANSI colors when enabled', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', true);
        (0, vitest_1.expect)(table).toContain('\x1b[');
    });
    (0, vitest_1.it)('renders without ANSI codes when color is disabled', () => {
        const table = (0, metrics_table_1.renderMetricsTable)(baseMetrics, 'A', 'B', false);
        (0, vitest_1.expect)(table).not.toContain('\x1b[');
    });
});
// ── renderUnifiedDiff ──
(0, vitest_1.describe)('renderUnifiedDiff', () => {
    const makeDiffResult = (textA, textB, model_a, model_b) => {
        // using imported diff from ../index
        return (0, index_1.diff)({ text: textA, model: model_a }, { text: textB, model: model_b }, { mode: 'unified' });
    };
    (0, vitest_1.it)('shows no differences for identical outputs', () => {
        const result = makeDiffResult('hello world', 'hello world');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('no differences');
    });
    (0, vitest_1.it)('shows removed lines with - prefix', () => {
        const result = makeDiffResult('line1\nline2', 'line1\nline3');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('- ');
    });
    (0, vitest_1.it)('shows added lines with + prefix', () => {
        const result = makeDiffResult('line1\nline2', 'line1\nline3');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('+ ');
    });
    (0, vitest_1.it)('includes model names in header', () => {
        const result = makeDiffResult('hello', 'world', 'gpt-4o', 'claude-sonnet');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('gpt-4o');
        (0, vitest_1.expect)(output).toContain('claude-sonnet');
    });
    (0, vitest_1.it)('uses default labels when no model names', () => {
        const result = makeDiffResult('hello', 'world');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('Output A');
        (0, vitest_1.expect)(output).toContain('Output B');
    });
    (0, vitest_1.it)('includes hunk headers', () => {
        const result = makeDiffResult('line1\nline2', 'line1\nline3');
        const output = (0, unified_1.renderUnifiedDiff)(result, false);
        (0, vitest_1.expect)(output).toContain('@@');
    });
});
// ── renderInlineDiff ──
(0, vitest_1.describe)('renderInlineDiff', () => {
    (0, vitest_1.it)('renders unchanged text as-is', () => {
        const segments = [{ text: 'hello world', type: 'unchanged' }];
        const output = (0, inline_1.renderInlineDiff)(segments, false);
        (0, vitest_1.expect)(output).toBe('hello world');
    });
    (0, vitest_1.it)('renders removed text with strikethrough markers', () => {
        const segments = [
            { text: 'hello ', type: 'unchanged' },
            { text: 'old', type: 'removed' },
        ];
        const output = (0, inline_1.renderInlineDiff)(segments, false);
        (0, vitest_1.expect)(output).toBe('hello ~~old~~');
    });
    (0, vitest_1.it)('renders added text with underline markers', () => {
        const segments = [
            { text: 'hello ', type: 'unchanged' },
            { text: 'new', type: 'added' },
        ];
        const output = (0, inline_1.renderInlineDiff)(segments, false);
        (0, vitest_1.expect)(output).toBe('hello __new__');
    });
    (0, vitest_1.it)('renders mixed changes', () => {
        const segments = [
            { text: 'hello ', type: 'unchanged' },
            { text: 'old', type: 'removed' },
            { text: 'new', type: 'added' },
            { text: ' world', type: 'unchanged' },
        ];
        const output = (0, inline_1.renderInlineDiff)(segments, false);
        (0, vitest_1.expect)(output).toBe('hello ~~old~~__new__ world');
    });
    (0, vitest_1.it)('uses ANSI codes when color is enabled', () => {
        const segments = [
            { text: 'removed', type: 'removed' },
            { text: 'added', type: 'added' },
        ];
        const output = (0, inline_1.renderInlineDiff)(segments, true);
        (0, vitest_1.expect)(output).toContain('\x1b[');
    });
});
// ── renderSideBySide ──
(0, vitest_1.describe)('renderSideBySide', () => {
    const makeDiffResult = (textA, textB) => {
        // using imported diff from ../index
        return (0, index_1.diff)({ text: textA }, { text: textB }, { mode: 'side-by-side' });
    };
    (0, vitest_1.it)('renders two columns', () => {
        const result = makeDiffResult('hello', 'world');
        const output = (0, side_by_side_1.renderSideBySide)(result, false, 80);
        (0, vitest_1.expect)(output).toContain('|');
    });
    (0, vitest_1.it)('includes column headers', () => {
        const result = makeDiffResult('hello', 'world');
        const output = (0, side_by_side_1.renderSideBySide)(result, false, 80);
        (0, vitest_1.expect)(output).toContain('Output A');
        (0, vitest_1.expect)(output).toContain('Output B');
    });
    (0, vitest_1.it)('includes separator line', () => {
        const result = makeDiffResult('hello', 'world');
        const output = (0, side_by_side_1.renderSideBySide)(result, false, 80);
        (0, vitest_1.expect)(output).toContain('─');
    });
});
// ── renderJsonDiff ──
(0, vitest_1.describe)('renderJsonDiff', () => {
    (0, vitest_1.it)('shows no differences for empty changes', () => {
        const output = (0, json_diff_1.renderJsonDiff)([], {}, {}, false);
        (0, vitest_1.expect)(output).toContain('no JSON differences');
    });
    (0, vitest_1.it)('shows added keys', () => {
        const changes = [
            { path: 'newKey', type: 'added', after: 'value' },
        ];
        const output = (0, json_diff_1.renderJsonDiff)(changes, {}, { newKey: 'value' }, false);
        (0, vitest_1.expect)(output).toContain('+ newKey');
        (0, vitest_1.expect)(output).toContain('"value"');
    });
    (0, vitest_1.it)('shows removed keys', () => {
        const changes = [
            { path: 'oldKey', type: 'removed', before: 'value' },
        ];
        const output = (0, json_diff_1.renderJsonDiff)(changes, { oldKey: 'value' }, {}, false);
        (0, vitest_1.expect)(output).toContain('- oldKey');
        (0, vitest_1.expect)(output).toContain('"value"');
    });
    (0, vitest_1.it)('shows changed values', () => {
        const changes = [
            { path: 'key', type: 'changed', before: 1, after: 2 },
        ];
        const output = (0, json_diff_1.renderJsonDiff)(changes, { key: 1 }, { key: 2 }, false);
        (0, vitest_1.expect)(output).toContain('- key: 1');
        (0, vitest_1.expect)(output).toContain('+ key: 2');
    });
    (0, vitest_1.it)('uses ANSI codes when color is enabled', () => {
        const changes = [
            { path: 'key', type: 'added', after: 'val' },
        ];
        const output = (0, json_diff_1.renderJsonDiff)(changes, {}, { key: 'val' }, true);
        (0, vitest_1.expect)(output).toContain('\x1b[');
    });
});
//# sourceMappingURL=formatters.test.js.map