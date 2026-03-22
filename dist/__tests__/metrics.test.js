"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_1 = require("../metrics");
// ── estimateCost ──
(0, vitest_1.describe)('estimateCost', () => {
    (0, vitest_1.it)('returns the provided cost directly', () => {
        const output = { text: 'hello', cost: 0.005 };
        (0, vitest_1.expect)((0, metrics_1.estimateCost)(output)).toBe(0.005);
    });
    (0, vitest_1.it)('computes cost from model and tokens', () => {
        const output = {
            text: 'hello',
            model: 'gpt-4o',
            tokens: { input: 100, output: 50 },
        };
        const cost = (0, metrics_1.estimateCost)(output);
        (0, vitest_1.expect)(cost).toBeDefined();
        (0, vitest_1.expect)(cost).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('returns undefined when model is unknown and no cost provided', () => {
        const output = {
            text: 'hello',
            model: 'unknown-model',
            tokens: { input: 100, output: 50 },
        };
        (0, vitest_1.expect)((0, metrics_1.estimateCost)(output)).toBeUndefined();
    });
    (0, vitest_1.it)('returns undefined when no model or cost', () => {
        const output = { text: 'hello' };
        (0, vitest_1.expect)((0, metrics_1.estimateCost)(output)).toBeUndefined();
    });
    (0, vitest_1.it)('uses pricing overrides', () => {
        const output = {
            text: 'hello',
            model: 'custom-model',
            tokens: { input: 1000, output: 500 },
        };
        const pricing = { 'custom-model': { input: 0.001, output: 0.002 } };
        const cost = (0, metrics_1.estimateCost)(output, pricing);
        (0, vitest_1.expect)(cost).toBe(1000 * 0.001 + 500 * 0.002);
    });
    (0, vitest_1.it)('handles zero tokens', () => {
        const output = {
            text: '',
            model: 'gpt-4o',
            tokens: { input: 0, output: 0 },
        };
        (0, vitest_1.expect)((0, metrics_1.estimateCost)(output)).toBe(0);
    });
    (0, vitest_1.it)('handles missing input tokens', () => {
        const output = {
            text: 'hello',
            model: 'gpt-4o',
            tokens: { output: 50 },
        };
        const cost = (0, metrics_1.estimateCost)(output);
        (0, vitest_1.expect)(cost).toBeDefined();
        // Should only include output cost
        const pricing = (0, metrics_1.getModelPricing)();
        (0, vitest_1.expect)(cost).toBe(50 * pricing['gpt-4o'].output);
    });
});
// ── getModelPricing ──
(0, vitest_1.describe)('getModelPricing', () => {
    (0, vitest_1.it)('returns a pricing table', () => {
        const pricing = (0, metrics_1.getModelPricing)();
        (0, vitest_1.expect)(pricing).toBeDefined();
        (0, vitest_1.expect)(pricing['gpt-4o']).toBeDefined();
        (0, vitest_1.expect)(pricing['gpt-4o'].input).toBeGreaterThan(0);
        (0, vitest_1.expect)(pricing['gpt-4o'].output).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('includes common models', () => {
        const pricing = (0, metrics_1.getModelPricing)();
        (0, vitest_1.expect)(pricing['gpt-4o']).toBeDefined();
        (0, vitest_1.expect)(pricing['gpt-4o-mini']).toBeDefined();
        (0, vitest_1.expect)(pricing['claude-sonnet']).toBeDefined();
        (0, vitest_1.expect)(pricing['claude-haiku']).toBeDefined();
        (0, vitest_1.expect)(pricing['gemini-pro']).toBeDefined();
    });
    (0, vitest_1.it)('returns a copy (not the original)', () => {
        const pricing1 = (0, metrics_1.getModelPricing)();
        const pricing2 = (0, metrics_1.getModelPricing)();
        pricing1['gpt-4o'].input = 999;
        (0, vitest_1.expect)(pricing2['gpt-4o'].input).not.toBe(999);
    });
});
// ── computeMetrics ──
(0, vitest_1.describe)('computeMetrics', () => {
    (0, vitest_1.it)('computes basic metrics for two outputs', async () => {
        const a = {
            text: 'Hello world',
            model: 'gpt-4o',
            tokens: { input: 10, output: 5 },
        };
        const b = {
            text: 'Hello earth',
            model: 'claude-sonnet',
            tokens: { input: 10, output: 5 },
        };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.tokens.a.output).toBe(5);
        (0, vitest_1.expect)(metrics.tokens.b.output).toBe(5);
        (0, vitest_1.expect)(metrics.similarity.jaccard).toBeGreaterThan(0);
        (0, vitest_1.expect)(metrics.length.a.words).toBeGreaterThan(0);
        (0, vitest_1.expect)(metrics.length.b.words).toBeGreaterThan(0);
        (0, vitest_1.expect)(metrics.model?.a).toBe('gpt-4o');
        (0, vitest_1.expect)(metrics.model?.b).toBe('claude-sonnet');
    });
    (0, vitest_1.it)('computes cost when model and tokens are available', async () => {
        const a = {
            text: 'Hello',
            model: 'gpt-4o',
            tokens: { input: 100, output: 50 },
        };
        const b = {
            text: 'World',
            model: 'gpt-4o-mini',
            tokens: { input: 100, output: 50 },
        };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.cost).toBeDefined();
        (0, vitest_1.expect)(metrics.cost.a).toBeGreaterThan(0);
        (0, vitest_1.expect)(metrics.cost.b).toBeGreaterThan(0);
        (0, vitest_1.expect)(typeof metrics.cost.delta).toBe('number');
        (0, vitest_1.expect)(typeof metrics.cost.deltaPercent).toBe('number');
    });
    (0, vitest_1.it)('computes latency when available', async () => {
        const a = { text: 'Hello', latency: 1000 };
        const b = { text: 'World', latency: 2000 };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.latency).toBeDefined();
        (0, vitest_1.expect)(metrics.latency.a).toBe(1000);
        (0, vitest_1.expect)(metrics.latency.b).toBe(2000);
        (0, vitest_1.expect)(metrics.latency.delta).toBe(1000);
    });
    (0, vitest_1.it)('omits latency when not available', async () => {
        const a = { text: 'Hello' };
        const b = { text: 'World' };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.latency).toBeUndefined();
    });
    (0, vitest_1.it)('uses embedFn for semantic similarity', async () => {
        const a = { text: 'Hello' };
        const b = { text: 'World' };
        const embedFn = async (text) => {
            if (text === 'Hello')
                return [1, 0, 0];
            return [0, 1, 0];
        };
        const metrics = await (0, metrics_1.computeMetrics)(a, b, { embedFn });
        (0, vitest_1.expect)(metrics.similarity.semantic).toBeDefined();
        (0, vitest_1.expect)(metrics.similarity.semantic).toBeCloseTo(0, 5);
    });
    (0, vitest_1.it)('computes length statistics', async () => {
        const a = { text: 'Hello world. Goodbye world.' };
        const b = { text: 'Hi there.' };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.length.a.words).toBe(4);
        (0, vitest_1.expect)(metrics.length.a.sentences).toBe(2);
        (0, vitest_1.expect)(metrics.length.b.words).toBe(2);
        (0, vitest_1.expect)(metrics.length.b.sentences).toBe(1);
    });
    (0, vitest_1.it)('handles outputs without models', async () => {
        const a = { text: 'Hello' };
        const b = { text: 'World' };
        const metrics = await (0, metrics_1.computeMetrics)(a, b);
        (0, vitest_1.expect)(metrics.model).toBeUndefined();
    });
});
//# sourceMappingURL=metrics.test.js.map