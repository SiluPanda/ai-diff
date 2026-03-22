"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../index");
// ── diff() integration ──
(0, vitest_1.describe)('diff() integration', () => {
    (0, vitest_1.it)('compares two plain strings', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth');
        (0, vitest_1.expect)(result.identical).toBe(false);
        (0, vitest_1.expect)(result.similarity.jaccard).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.similarity.jaccard).toBeLessThan(1);
        (0, vitest_1.expect)(result.hunks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.mode).toBe('unified');
        (0, vitest_1.expect)(result.timestamp).toBeDefined();
        (0, vitest_1.expect)(result.durationMs).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)('detects identical outputs', () => {
        const result = (0, index_1.diff)('same text', 'same text');
        (0, vitest_1.expect)(result.identical).toBe(true);
        (0, vitest_1.expect)(result.similarity.jaccard).toBe(1.0);
        (0, vitest_1.expect)(result.hunks).toEqual([]);
    });
    (0, vitest_1.it)('compares LLMOutput objects with metadata', () => {
        const result = (0, index_1.diff)({ text: 'Paris is the capital of France.', model: 'gpt-4o', tokens: { input: 10, output: 8 }, latency: 1240 }, { text: 'The capital of France is Paris.', model: 'claude-sonnet', tokens: { input: 10, output: 8 }, latency: 980 });
        (0, vitest_1.expect)(result.identical).toBe(false);
        (0, vitest_1.expect)(result.metrics.model?.a).toBe('gpt-4o');
        (0, vitest_1.expect)(result.metrics.model?.b).toBe('claude-sonnet');
        (0, vitest_1.expect)(result.metrics.tokens.a.output).toBe(8);
        (0, vitest_1.expect)(result.metrics.tokens.b.output).toBe(8);
        (0, vitest_1.expect)(result.metrics.latency).toBeDefined();
        (0, vitest_1.expect)(result.metrics.latency.a).toBe(1240);
        (0, vitest_1.expect)(result.metrics.latency.b).toBe(980);
        (0, vitest_1.expect)(result.metrics.latency.delta).toBe(-260);
    });
    (0, vitest_1.it)('estimates tokens when not provided', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth');
        (0, vitest_1.expect)(result.outputA.tokens).toBeDefined();
        (0, vitest_1.expect)(result.outputA.tokens.output).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('computes cost when model and tokens are available', () => {
        const result = (0, index_1.diff)({ text: 'Hello', model: 'gpt-4o', tokens: { input: 100, output: 50 } }, { text: 'World', model: 'gpt-4o', tokens: { input: 100, output: 75 } });
        (0, vitest_1.expect)(result.metrics.cost).toBeDefined();
        (0, vitest_1.expect)(result.metrics.cost.a).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.metrics.cost.b).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.metrics.cost.delta).toBeDefined();
    });
    (0, vitest_1.it)('includes length stats', () => {
        const result = (0, index_1.diff)('Hello world. Goodbye.', 'Hi there.');
        (0, vitest_1.expect)(result.metrics.length.a.words).toBe(3);
        (0, vitest_1.expect)(result.metrics.length.a.sentences).toBe(2);
        (0, vitest_1.expect)(result.metrics.length.b.words).toBe(2);
        (0, vitest_1.expect)(result.metrics.length.b.sentences).toBe(1);
    });
    (0, vitest_1.it)('works with unified mode', () => {
        const result = (0, index_1.diff)('line1\nline2', 'line1\nline3', { mode: 'unified' });
        (0, vitest_1.expect)(result.mode).toBe('unified');
        (0, vitest_1.expect)(result.hunks.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('works with inline mode', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth', { mode: 'inline' });
        (0, vitest_1.expect)(result.mode).toBe('inline');
    });
    (0, vitest_1.it)('works with side-by-side mode', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth', { mode: 'side-by-side' });
        (0, vitest_1.expect)(result.mode).toBe('side-by-side');
    });
    (0, vitest_1.it)('works with metrics mode', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth', { mode: 'metrics' });
        (0, vitest_1.expect)(result.mode).toBe('metrics');
        (0, vitest_1.expect)(result.hunks).toEqual([]);
    });
    (0, vitest_1.it)('works with json mode for JSON strings', () => {
        const result = (0, index_1.diff)('{"answer": "Paris", "confidence": 0.95}', '{"answer": "Paris", "confidence": 0.98}', { mode: 'json' });
        (0, vitest_1.expect)(result.mode).toBe('json');
        (0, vitest_1.expect)(result.jsonChanges).toBeDefined();
        (0, vitest_1.expect)(result.jsonChanges.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.jsonChanges).toContainEqual(vitest_1.expect.objectContaining({ path: 'confidence', type: 'changed' }));
    });
    (0, vitest_1.it)('falls back to text diff for invalid JSON in json mode', () => {
        const result = (0, index_1.diff)('not json', 'also not json', { mode: 'json' });
        (0, vitest_1.expect)(result.mode).toBe('json');
        (0, vitest_1.expect)(result.jsonChanges).toBeUndefined();
        (0, vitest_1.expect)(result.hunks.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('uses custom context lines', () => {
        const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
        const a = lines.join('\n');
        const b = [...lines.slice(0, 9), 'changed', ...lines.slice(10)].join('\n');
        const result1 = (0, index_1.diff)(a, b, { contextLines: 1 });
        const result5 = (0, index_1.diff)(a, b, { contextLines: 5 });
        const segs1 = result1.hunks.reduce((acc, h) => acc + h.segments.length, 0);
        const segs5 = result5.hunks.reduce((acc, h) => acc + h.segments.length, 0);
        (0, vitest_1.expect)(segs5).toBeGreaterThanOrEqual(segs1);
    });
    (0, vitest_1.it)('accepts pricing overrides', () => {
        const pricing = { 'my-model': { input: 0.01, output: 0.02 } };
        const result = (0, index_1.diff)({ text: 'A', model: 'my-model', tokens: { input: 100, output: 50 } }, { text: 'B', model: 'my-model', tokens: { input: 100, output: 75 } }, { pricing });
        (0, vitest_1.expect)(result.metrics.cost).toBeDefined();
        (0, vitest_1.expect)(result.metrics.cost.a).toBe(100 * 0.01 + 50 * 0.02);
    });
    (0, vitest_1.it)('handles empty strings', () => {
        const result = (0, index_1.diff)('', '');
        (0, vitest_1.expect)(result.identical).toBe(true);
    });
    (0, vitest_1.it)('handles one empty string', () => {
        const result = (0, index_1.diff)('hello', '');
        (0, vitest_1.expect)(result.identical).toBe(false);
        (0, vitest_1.expect)(result.hunks.length).toBeGreaterThan(0);
    });
});
// ── diffOutputs() integration ──
(0, vitest_1.describe)('diffOutputs() integration', () => {
    (0, vitest_1.it)('compares two outputs pairwise', () => {
        const result = (0, index_1.diffOutputs)(['hello', 'world']);
        (0, vitest_1.expect)(result.pairwise.length).toBe(1);
        (0, vitest_1.expect)(result.pairwise[0].indexA).toBe(0);
        (0, vitest_1.expect)(result.pairwise[0].indexB).toBe(1);
        (0, vitest_1.expect)(result.outputs.length).toBe(2);
    });
    (0, vitest_1.it)('compares three outputs pairwise (3 pairs)', () => {
        const result = (0, index_1.diffOutputs)(['a', 'b', 'c']);
        (0, vitest_1.expect)(result.pairwise.length).toBe(3);
        (0, vitest_1.expect)(result.pairwise.map(p => [p.indexA, p.indexB])).toEqual([
            [0, 1], [0, 2], [1, 2],
        ]);
    });
    (0, vitest_1.it)('produces a metrics table', () => {
        const result = (0, index_1.diffOutputs)([
            { text: 'A output', model: 'model-a' },
            { text: 'B output', model: 'model-b' },
        ]);
        (0, vitest_1.expect)(result.metricsTable.labels).toEqual(['model-a', 'model-b']);
        (0, vitest_1.expect)(result.metricsTable.outputTokens.length).toBe(2);
        (0, vitest_1.expect)(result.metricsTable.wordCounts.length).toBe(2);
    });
    (0, vitest_1.it)('uses default labels when no model names', () => {
        const result = (0, index_1.diffOutputs)(['hello', 'world', 'foo']);
        (0, vitest_1.expect)(result.metricsTable.labels).toEqual(['Output A', 'Output B', 'Output C']);
    });
    (0, vitest_1.it)('includes timing information', () => {
        const result = (0, index_1.diffOutputs)(['hello', 'world']);
        (0, vitest_1.expect)(result.durationMs).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.timestamp).toBeDefined();
    });
});
// ── compare() integration ──
(0, vitest_1.describe)('compare() integration', () => {
    (0, vitest_1.it)('calls multiple models and compares outputs', async () => {
        const llmFn = async (_prompt, model) => {
            return { text: `Response from ${model}`, model };
        };
        const result = await (0, index_1.compare)('test prompt', ['model-a', 'model-b'], llmFn);
        (0, vitest_1.expect)(result.prompt).toBe('test prompt');
        (0, vitest_1.expect)(result.models).toEqual(['model-a', 'model-b']);
        (0, vitest_1.expect)(result.calls.length).toBe(2);
        (0, vitest_1.expect)(result.calls.every(c => c.status === 'success')).toBe(true);
        (0, vitest_1.expect)(result.outputs.length).toBe(2);
        (0, vitest_1.expect)(result.pairwise.length).toBe(1);
    });
    (0, vitest_1.it)('handles model call failures gracefully', async () => {
        const llmFn = async (_prompt, model) => {
            if (model === 'fail-model')
                throw new Error('API error');
            return `Response from ${model}`;
        };
        const result = await (0, index_1.compare)('test', ['good-model', 'fail-model'], llmFn);
        (0, vitest_1.expect)(result.calls.length).toBe(2);
        const failCall = result.calls.find(c => c.model === 'fail-model');
        (0, vitest_1.expect)(failCall?.status).toBe('error');
        (0, vitest_1.expect)(failCall?.error).toContain('API error');
        const goodCall = result.calls.find(c => c.model === 'good-model');
        (0, vitest_1.expect)(goodCall?.status).toBe('success');
    });
    (0, vitest_1.it)('handles string return values from llmFn', async () => {
        const llmFn = async () => 'plain string response';
        const result = await (0, index_1.compare)('test', ['model-a'], llmFn);
        (0, vitest_1.expect)(result.outputs[0].text).toBe('plain string response');
    });
    (0, vitest_1.it)('measures latency automatically', async () => {
        const llmFn = async (_prompt, _model) => {
            await new Promise(r => setTimeout(r, 10));
            return 'response';
        };
        const result = await (0, index_1.compare)('test', ['model-a'], llmFn);
        (0, vitest_1.expect)(result.calls[0].latencyMs).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles timeout', async () => {
        const llmFn = async () => {
            await new Promise(r => setTimeout(r, 5000));
            return 'never';
        };
        const result = await (0, index_1.compare)('test', ['slow-model'], llmFn, { timeout: 50 });
        (0, vitest_1.expect)(result.calls[0].status).toBe('error');
        (0, vitest_1.expect)(result.calls[0].error).toContain('Timeout');
    }, 10000);
    (0, vitest_1.it)('respects concurrency limit', async () => {
        let concurrentCalls = 0;
        let maxConcurrent = 0;
        const llmFn = async (_prompt, _model) => {
            concurrentCalls++;
            maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
            await new Promise(r => setTimeout(r, 50));
            concurrentCalls--;
            return 'response';
        };
        await (0, index_1.compare)('test', ['a', 'b', 'c', 'd'], llmFn, { concurrency: 2 });
        (0, vitest_1.expect)(maxConcurrent).toBeLessThanOrEqual(2);
    }, 10000);
});
// ── formatDiff() integration ──
(0, vitest_1.describe)('formatDiff() integration', () => {
    (0, vitest_1.it)('formats as JSON', () => {
        const result = (0, index_1.diff)('hello', 'world');
        const output = (0, index_1.formatDiff)(result, 'json');
        const parsed = JSON.parse(output);
        (0, vitest_1.expect)(parsed.identical).toBe(false);
        (0, vitest_1.expect)(parsed.mode).toBe('unified');
    });
    (0, vitest_1.it)('formats as terminal (default)', () => {
        const result = (0, index_1.diff)('hello', 'world');
        const output = (0, index_1.formatDiff)(result, 'terminal');
        (0, vitest_1.expect)(typeof output).toBe('string');
        (0, vitest_1.expect)(output.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('formats as plain text', () => {
        const result = (0, index_1.diff)('hello', 'world');
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(typeof output).toBe('string');
        // Should not contain ANSI codes
        (0, vitest_1.expect)(output).not.toContain('\x1b[');
    });
    (0, vitest_1.it)('formats inline mode', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth', { mode: 'inline' });
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(output).toContain('~~');
        (0, vitest_1.expect)(output).toContain('__');
    });
    (0, vitest_1.it)('formats metrics mode', () => {
        const result = (0, index_1.diff)({ text: 'hello', model: 'gpt-4o', tokens: { input: 10, output: 5 } }, { text: 'world', model: 'claude-sonnet', tokens: { input: 10, output: 5 } }, { mode: 'metrics' });
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(output).toContain('Metric');
        (0, vitest_1.expect)(output).toContain('Output tokens');
    });
    (0, vitest_1.it)('formats JSON diff mode', () => {
        const result = (0, index_1.diff)('{"key": "old"}', '{"key": "new"}', { mode: 'json' });
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(output).toContain('key');
    });
    (0, vitest_1.it)('formats MultiDiffResult', () => {
        const result = (0, index_1.diffOutputs)([
            { text: 'A', model: 'model-a' },
            { text: 'B', model: 'model-b' },
        ]);
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(output).toContain('model-a');
        (0, vitest_1.expect)(output).toContain('model-b');
    });
    (0, vitest_1.it)('formats side-by-side mode', () => {
        const result = (0, index_1.diff)('hello world', 'hello earth', { mode: 'side-by-side' });
        const output = (0, index_1.formatDiff)(result, 'plain');
        (0, vitest_1.expect)(output).toContain('|');
    });
});
// ── Exported utility functions ──
(0, vitest_1.describe)('exported utilities', () => {
    (0, vitest_1.it)('normalizeOutput works', () => {
        (0, vitest_1.expect)((0, index_1.normalizeOutput)('hello')).toEqual({ text: 'hello' });
    });
    (0, vitest_1.it)('enrichOutput works', () => {
        const result = (0, index_1.enrichOutput)({ text: 'hello' });
        (0, vitest_1.expect)(result.tokens).toBeDefined();
    });
    (0, vitest_1.it)('jaccardSimilarity works', () => {
        (0, vitest_1.expect)((0, index_1.jaccardSimilarity)('hello world', 'hello world')).toBe(1.0);
    });
    (0, vitest_1.it)('computeLengthStats works', () => {
        const stats = (0, index_1.computeLengthStats)('Hello world.');
        (0, vitest_1.expect)(stats.words).toBe(2);
        (0, vitest_1.expect)(stats.sentences).toBe(1);
        (0, vitest_1.expect)(stats.characters).toBe(12);
    });
    (0, vitest_1.it)('estimateCost works', () => {
        (0, vitest_1.expect)((0, index_1.estimateCost)({ text: 'test' })).toBeUndefined();
    });
    (0, vitest_1.it)('getModelPricing works', () => {
        const pricing = (0, index_1.getModelPricing)();
        (0, vitest_1.expect)(Object.keys(pricing).length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('diffWords works', () => {
        const result = (0, index_1.diffWords)('hello world', 'hello earth');
        (0, vitest_1.expect)(result.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('diffLines works', () => {
        const result = (0, index_1.diffLines)('line1\nline2', 'line1\nline3');
        (0, vitest_1.expect)(result.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('diffJson works', () => {
        const result = (0, index_1.diffJson)({ a: 1 }, { a: 2 });
        (0, vitest_1.expect)(result.length).toBe(1);
    });
    (0, vitest_1.it)('tryParseJson works', () => {
        (0, vitest_1.expect)((0, index_1.tryParseJson)('{"a": 1}')).toEqual({ a: 1 });
        (0, vitest_1.expect)((0, index_1.tryParseJson)('not json')).toBeNull();
    });
});
// ── Edge cases ──
(0, vitest_1.describe)('edge cases', () => {
    (0, vitest_1.it)('handles very long texts', () => {
        const a = 'word '.repeat(1000).trim();
        const b = 'word '.repeat(500).trim() + ' different ' + 'word '.repeat(499).trim();
        const result = (0, index_1.diff)(a, b);
        (0, vitest_1.expect)(result.identical).toBe(false);
        (0, vitest_1.expect)(result.metrics.length.a.words).toBe(1000);
    });
    (0, vitest_1.it)('handles special characters', () => {
        const result = (0, index_1.diff)('hello <world> & "friends"', 'hello <earth> & "enemies"');
        (0, vitest_1.expect)(result.identical).toBe(false);
    });
    (0, vitest_1.it)('handles unicode', () => {
        const result = (0, index_1.diff)('Hello monde', 'Hello welt');
        (0, vitest_1.expect)(result.identical).toBe(false);
    });
    (0, vitest_1.it)('handles newlines in various formats', () => {
        const result = (0, index_1.diff)('line1\nline2', 'line1\nline2\nline3');
        (0, vitest_1.expect)(result.identical).toBe(false);
    });
    (0, vitest_1.it)('handles mixed string and LLMOutput inputs', () => {
        const result = (0, index_1.diff)('plain string', { text: 'llm output', model: 'gpt-4o' });
        (0, vitest_1.expect)(result.identical).toBe(false);
        (0, vitest_1.expect)(result.outputA.model).toBeUndefined();
        (0, vitest_1.expect)(result.outputB.model).toBe('gpt-4o');
    });
    (0, vitest_1.it)('handles whitespace-only differences', () => {
        const result = (0, index_1.diff)('hello world', 'hello  world');
        (0, vitest_1.expect)(result.identical).toBe(false);
    });
    (0, vitest_1.it)('Jaccard similarity is 1.0 for same words different order', () => {
        const result = (0, index_1.diff)('Paris is the capital of France', 'The capital of France is Paris');
        (0, vitest_1.expect)(result.similarity.jaccard).toBe(1.0);
    });
});
//# sourceMappingURL=integration.test.js.map