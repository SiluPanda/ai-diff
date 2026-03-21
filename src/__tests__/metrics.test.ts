import { describe, it, expect } from 'vitest';
import { computeMetrics, estimateCost, getModelPricing } from '../metrics';
import { LLMOutput } from '../types';

// ── estimateCost ──

describe('estimateCost', () => {
  it('returns the provided cost directly', () => {
    const output: LLMOutput = { text: 'hello', cost: 0.005 };
    expect(estimateCost(output)).toBe(0.005);
  });

  it('computes cost from model and tokens', () => {
    const output: LLMOutput = {
      text: 'hello',
      model: 'gpt-4o',
      tokens: { input: 100, output: 50 },
    };
    const cost = estimateCost(output);
    expect(cost).toBeDefined();
    expect(cost!).toBeGreaterThan(0);
  });

  it('returns undefined when model is unknown and no cost provided', () => {
    const output: LLMOutput = {
      text: 'hello',
      model: 'unknown-model',
      tokens: { input: 100, output: 50 },
    };
    expect(estimateCost(output)).toBeUndefined();
  });

  it('returns undefined when no model or cost', () => {
    const output: LLMOutput = { text: 'hello' };
    expect(estimateCost(output)).toBeUndefined();
  });

  it('uses pricing overrides', () => {
    const output: LLMOutput = {
      text: 'hello',
      model: 'custom-model',
      tokens: { input: 1000, output: 500 },
    };
    const pricing = { 'custom-model': { input: 0.001, output: 0.002 } };
    const cost = estimateCost(output, pricing);
    expect(cost).toBe(1000 * 0.001 + 500 * 0.002);
  });

  it('handles zero tokens', () => {
    const output: LLMOutput = {
      text: '',
      model: 'gpt-4o',
      tokens: { input: 0, output: 0 },
    };
    expect(estimateCost(output)).toBe(0);
  });

  it('handles missing input tokens', () => {
    const output: LLMOutput = {
      text: 'hello',
      model: 'gpt-4o',
      tokens: { output: 50 },
    };
    const cost = estimateCost(output);
    expect(cost).toBeDefined();
    // Should only include output cost
    const pricing = getModelPricing();
    expect(cost).toBe(50 * pricing['gpt-4o'].output);
  });
});

// ── getModelPricing ──

describe('getModelPricing', () => {
  it('returns a pricing table', () => {
    const pricing = getModelPricing();
    expect(pricing).toBeDefined();
    expect(pricing['gpt-4o']).toBeDefined();
    expect(pricing['gpt-4o'].input).toBeGreaterThan(0);
    expect(pricing['gpt-4o'].output).toBeGreaterThan(0);
  });

  it('includes common models', () => {
    const pricing = getModelPricing();
    expect(pricing['gpt-4o']).toBeDefined();
    expect(pricing['gpt-4o-mini']).toBeDefined();
    expect(pricing['claude-sonnet']).toBeDefined();
    expect(pricing['claude-haiku']).toBeDefined();
    expect(pricing['gemini-pro']).toBeDefined();
  });

  it('returns a copy (not the original)', () => {
    const pricing1 = getModelPricing();
    const pricing2 = getModelPricing();
    pricing1['gpt-4o'].input = 999;
    expect(pricing2['gpt-4o'].input).not.toBe(999);
  });
});

// ── computeMetrics ──

describe('computeMetrics', () => {
  it('computes basic metrics for two outputs', async () => {
    const a: LLMOutput = {
      text: 'Hello world',
      model: 'gpt-4o',
      tokens: { input: 10, output: 5 },
    };
    const b: LLMOutput = {
      text: 'Hello earth',
      model: 'claude-sonnet',
      tokens: { input: 10, output: 5 },
    };
    const metrics = await computeMetrics(a, b);

    expect(metrics.tokens.a.output).toBe(5);
    expect(metrics.tokens.b.output).toBe(5);
    expect(metrics.similarity.jaccard).toBeGreaterThan(0);
    expect(metrics.length.a.words).toBeGreaterThan(0);
    expect(metrics.length.b.words).toBeGreaterThan(0);
    expect(metrics.model?.a).toBe('gpt-4o');
    expect(metrics.model?.b).toBe('claude-sonnet');
  });

  it('computes cost when model and tokens are available', async () => {
    const a: LLMOutput = {
      text: 'Hello',
      model: 'gpt-4o',
      tokens: { input: 100, output: 50 },
    };
    const b: LLMOutput = {
      text: 'World',
      model: 'gpt-4o-mini',
      tokens: { input: 100, output: 50 },
    };
    const metrics = await computeMetrics(a, b);
    expect(metrics.cost).toBeDefined();
    expect(metrics.cost!.a).toBeGreaterThan(0);
    expect(metrics.cost!.b).toBeGreaterThan(0);
    expect(typeof metrics.cost!.delta).toBe('number');
    expect(typeof metrics.cost!.deltaPercent).toBe('number');
  });

  it('computes latency when available', async () => {
    const a: LLMOutput = { text: 'Hello', latency: 1000 };
    const b: LLMOutput = { text: 'World', latency: 2000 };
    const metrics = await computeMetrics(a, b);
    expect(metrics.latency).toBeDefined();
    expect(metrics.latency!.a).toBe(1000);
    expect(metrics.latency!.b).toBe(2000);
    expect(metrics.latency!.delta).toBe(1000);
  });

  it('omits latency when not available', async () => {
    const a: LLMOutput = { text: 'Hello' };
    const b: LLMOutput = { text: 'World' };
    const metrics = await computeMetrics(a, b);
    expect(metrics.latency).toBeUndefined();
  });

  it('uses embedFn for semantic similarity', async () => {
    const a: LLMOutput = { text: 'Hello' };
    const b: LLMOutput = { text: 'World' };
    const embedFn = async (text: string) => {
      if (text === 'Hello') return [1, 0, 0];
      return [0, 1, 0];
    };
    const metrics = await computeMetrics(a, b, { embedFn });
    expect(metrics.similarity.semantic).toBeDefined();
    expect(metrics.similarity.semantic).toBeCloseTo(0, 5);
  });

  it('computes length statistics', async () => {
    const a: LLMOutput = { text: 'Hello world. Goodbye world.' };
    const b: LLMOutput = { text: 'Hi there.' };
    const metrics = await computeMetrics(a, b);
    expect(metrics.length.a.words).toBe(4);
    expect(metrics.length.a.sentences).toBe(2);
    expect(metrics.length.b.words).toBe(2);
    expect(metrics.length.b.sentences).toBe(1);
  });

  it('handles outputs without models', async () => {
    const a: LLMOutput = { text: 'Hello' };
    const b: LLMOutput = { text: 'World' };
    const metrics = await computeMetrics(a, b);
    expect(metrics.model).toBeUndefined();
  });
});
