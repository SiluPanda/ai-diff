import { describe, it, expect } from 'vitest';
import {
  diff,
  diffOutputs,
  compare,
  formatDiff,
  jaccardSimilarity,
  computeLengthStats,
  normalizeOutput,
  enrichOutput,
  estimateCost,
  getModelPricing,
  diffWords,
  diffLines,
  diffJson,
  tryParseJson,
} from '../index';

// ── diff() integration ──

describe('diff() integration', () => {
  it('compares two plain strings', () => {
    const result = diff('hello world', 'hello earth');
    expect(result.identical).toBe(false);
    expect(result.similarity.jaccard).toBeGreaterThan(0);
    expect(result.similarity.jaccard).toBeLessThan(1);
    expect(result.hunks.length).toBeGreaterThan(0);
    expect(result.mode).toBe('unified');
    expect(result.timestamp).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('detects identical outputs', () => {
    const result = diff('same text', 'same text');
    expect(result.identical).toBe(true);
    expect(result.similarity.jaccard).toBe(1.0);
    expect(result.hunks).toEqual([]);
  });

  it('compares LLMOutput objects with metadata', () => {
    const result = diff(
      { text: 'Paris is the capital of France.', model: 'gpt-4o', tokens: { input: 10, output: 8 }, latency: 1240 },
      { text: 'The capital of France is Paris.', model: 'claude-sonnet', tokens: { input: 10, output: 8 }, latency: 980 },
    );

    expect(result.identical).toBe(false);
    expect(result.metrics.model?.a).toBe('gpt-4o');
    expect(result.metrics.model?.b).toBe('claude-sonnet');
    expect(result.metrics.tokens.a.output).toBe(8);
    expect(result.metrics.tokens.b.output).toBe(8);
    expect(result.metrics.latency).toBeDefined();
    expect(result.metrics.latency!.a).toBe(1240);
    expect(result.metrics.latency!.b).toBe(980);
    expect(result.metrics.latency!.delta).toBe(-260);
  });

  it('estimates tokens when not provided', () => {
    const result = diff('hello world', 'hello earth');
    expect(result.outputA.tokens).toBeDefined();
    expect(result.outputA.tokens!.output).toBeGreaterThan(0);
  });

  it('computes cost when model and tokens are available', () => {
    const result = diff(
      { text: 'Hello', model: 'gpt-4o', tokens: { input: 100, output: 50 } },
      { text: 'World', model: 'gpt-4o', tokens: { input: 100, output: 75 } },
    );
    expect(result.metrics.cost).toBeDefined();
    expect(result.metrics.cost!.a).toBeGreaterThan(0);
    expect(result.metrics.cost!.b).toBeGreaterThan(0);
    expect(result.metrics.cost!.delta).toBeDefined();
  });

  it('includes length stats', () => {
    const result = diff('Hello world. Goodbye.', 'Hi there.');
    expect(result.metrics.length.a.words).toBe(3);
    expect(result.metrics.length.a.sentences).toBe(2);
    expect(result.metrics.length.b.words).toBe(2);
    expect(result.metrics.length.b.sentences).toBe(1);
  });

  it('works with unified mode', () => {
    const result = diff('line1\nline2', 'line1\nline3', { mode: 'unified' });
    expect(result.mode).toBe('unified');
    expect(result.hunks.length).toBeGreaterThan(0);
  });

  it('works with inline mode', () => {
    const result = diff('hello world', 'hello earth', { mode: 'inline' });
    expect(result.mode).toBe('inline');
  });

  it('works with side-by-side mode', () => {
    const result = diff('hello world', 'hello earth', { mode: 'side-by-side' });
    expect(result.mode).toBe('side-by-side');
  });

  it('works with metrics mode', () => {
    const result = diff('hello world', 'hello earth', { mode: 'metrics' });
    expect(result.mode).toBe('metrics');
    expect(result.hunks).toEqual([]);
  });

  it('works with json mode for JSON strings', () => {
    const result = diff(
      '{"answer": "Paris", "confidence": 0.95}',
      '{"answer": "Paris", "confidence": 0.98}',
      { mode: 'json' },
    );
    expect(result.mode).toBe('json');
    expect(result.jsonChanges).toBeDefined();
    expect(result.jsonChanges!.length).toBeGreaterThan(0);
    expect(result.jsonChanges!).toContainEqual(
      expect.objectContaining({ path: 'confidence', type: 'changed' }),
    );
  });

  it('falls back to text diff for invalid JSON in json mode', () => {
    const result = diff('not json', 'also not json', { mode: 'json' });
    expect(result.mode).toBe('json');
    expect(result.jsonChanges).toBeUndefined();
    expect(result.hunks.length).toBeGreaterThan(0);
  });

  it('uses custom context lines', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
    const a = lines.join('\n');
    const b = [...lines.slice(0, 9), 'changed', ...lines.slice(10)].join('\n');

    const result1 = diff(a, b, { contextLines: 1 });
    const result5 = diff(a, b, { contextLines: 5 });

    const segs1 = result1.hunks.reduce((acc, h) => acc + h.segments.length, 0);
    const segs5 = result5.hunks.reduce((acc, h) => acc + h.segments.length, 0);
    expect(segs5).toBeGreaterThanOrEqual(segs1);
  });

  it('accepts pricing overrides', () => {
    const pricing = { 'my-model': { input: 0.01, output: 0.02 } };
    const result = diff(
      { text: 'A', model: 'my-model', tokens: { input: 100, output: 50 } },
      { text: 'B', model: 'my-model', tokens: { input: 100, output: 75 } },
      { pricing },
    );
    expect(result.metrics.cost).toBeDefined();
    expect(result.metrics.cost!.a).toBe(100 * 0.01 + 50 * 0.02);
  });

  it('handles empty strings', () => {
    const result = diff('', '');
    expect(result.identical).toBe(true);
  });

  it('handles one empty string', () => {
    const result = diff('hello', '');
    expect(result.identical).toBe(false);
    expect(result.hunks.length).toBeGreaterThan(0);
  });
});

// ── diffOutputs() integration ──

describe('diffOutputs() integration', () => {
  it('compares two outputs pairwise', () => {
    const result = diffOutputs(['hello', 'world']);
    expect(result.pairwise.length).toBe(1);
    expect(result.pairwise[0].indexA).toBe(0);
    expect(result.pairwise[0].indexB).toBe(1);
    expect(result.outputs.length).toBe(2);
  });

  it('compares three outputs pairwise (3 pairs)', () => {
    const result = diffOutputs(['a', 'b', 'c']);
    expect(result.pairwise.length).toBe(3);
    expect(result.pairwise.map(p => [p.indexA, p.indexB])).toEqual([
      [0, 1], [0, 2], [1, 2],
    ]);
  });

  it('produces a metrics table', () => {
    const result = diffOutputs([
      { text: 'A output', model: 'model-a' },
      { text: 'B output', model: 'model-b' },
    ]);
    expect(result.metricsTable.labels).toEqual(['model-a', 'model-b']);
    expect(result.metricsTable.outputTokens.length).toBe(2);
    expect(result.metricsTable.wordCounts.length).toBe(2);
  });

  it('uses default labels when no model names', () => {
    const result = diffOutputs(['hello', 'world', 'foo']);
    expect(result.metricsTable.labels).toEqual(['Output A', 'Output B', 'Output C']);
  });

  it('includes timing information', () => {
    const result = diffOutputs(['hello', 'world']);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });
});

// ── compare() integration ──

describe('compare() integration', () => {
  it('calls multiple models and compares outputs', async () => {
    const llmFn = async (_prompt: string, model: string) => {
      return { text: `Response from ${model}`, model };
    };

    const result = await compare('test prompt', ['model-a', 'model-b'], llmFn);

    expect(result.prompt).toBe('test prompt');
    expect(result.models).toEqual(['model-a', 'model-b']);
    expect(result.calls.length).toBe(2);
    expect(result.calls.every(c => c.status === 'success')).toBe(true);
    expect(result.outputs.length).toBe(2);
    expect(result.pairwise.length).toBe(1);
  });

  it('handles model call failures gracefully', async () => {
    const llmFn = async (_prompt: string, model: string) => {
      if (model === 'fail-model') throw new Error('API error');
      return `Response from ${model}`;
    };

    const result = await compare('test', ['good-model', 'fail-model'], llmFn);

    expect(result.calls.length).toBe(2);
    const failCall = result.calls.find(c => c.model === 'fail-model');
    expect(failCall?.status).toBe('error');
    expect(failCall?.error).toContain('API error');

    const goodCall = result.calls.find(c => c.model === 'good-model');
    expect(goodCall?.status).toBe('success');
  });

  it('handles string return values from llmFn', async () => {
    const llmFn = async () => 'plain string response';
    const result = await compare('test', ['model-a'], llmFn);
    expect(result.outputs[0].text).toBe('plain string response');
  });

  it('measures latency automatically', async () => {
    const llmFn = async (_prompt: string, _model: string) => {
      await new Promise(r => setTimeout(r, 10));
      return 'response';
    };

    const result = await compare('test', ['model-a'], llmFn);
    expect(result.calls[0].latencyMs).toBeGreaterThan(0);
  });

  it('handles timeout', async () => {
    const llmFn = async () => {
      await new Promise(r => setTimeout(r, 5000));
      return 'never';
    };

    const result = await compare('test', ['slow-model'], llmFn, { timeout: 50 });
    expect(result.calls[0].status).toBe('error');
    expect(result.calls[0].error).toContain('Timeout');
  }, 10000);

  it('respects concurrency limit', async () => {
    let concurrentCalls = 0;
    let maxConcurrent = 0;

    const llmFn = async (_prompt: string, _model: string) => {
      concurrentCalls++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
      await new Promise(r => setTimeout(r, 50));
      concurrentCalls--;
      return 'response';
    };

    await compare('test', ['a', 'b', 'c', 'd'], llmFn, { concurrency: 2 });
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  }, 10000);
});

// ── formatDiff() integration ──

describe('formatDiff() integration', () => {
  it('formats as JSON', () => {
    const result = diff('hello', 'world');
    const output = formatDiff(result, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.identical).toBe(false);
    expect(parsed.mode).toBe('unified');
  });

  it('formats as terminal (default)', () => {
    const result = diff('hello', 'world');
    const output = formatDiff(result, 'terminal');
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('formats as plain text', () => {
    const result = diff('hello', 'world');
    const output = formatDiff(result, 'plain');
    expect(typeof output).toBe('string');
    // Should not contain ANSI codes
    expect(output).not.toContain('\x1b[');
  });

  it('formats inline mode', () => {
    const result = diff('hello world', 'hello earth', { mode: 'inline' });
    const output = formatDiff(result, 'plain');
    expect(output).toContain('~~');
    expect(output).toContain('__');
  });

  it('formats metrics mode', () => {
    const result = diff(
      { text: 'hello', model: 'gpt-4o', tokens: { input: 10, output: 5 } },
      { text: 'world', model: 'claude-sonnet', tokens: { input: 10, output: 5 } },
      { mode: 'metrics' },
    );
    const output = formatDiff(result, 'plain');
    expect(output).toContain('Metric');
    expect(output).toContain('Output tokens');
  });

  it('formats JSON diff mode', () => {
    const result = diff(
      '{"key": "old"}',
      '{"key": "new"}',
      { mode: 'json' },
    );
    const output = formatDiff(result, 'plain');
    expect(output).toContain('key');
  });

  it('formats MultiDiffResult', () => {
    const result = diffOutputs([
      { text: 'A', model: 'model-a' },
      { text: 'B', model: 'model-b' },
    ]);
    const output = formatDiff(result, 'plain');
    expect(output).toContain('model-a');
    expect(output).toContain('model-b');
  });

  it('formats side-by-side mode', () => {
    const result = diff('hello world', 'hello earth', { mode: 'side-by-side' });
    const output = formatDiff(result, 'plain');
    expect(output).toContain('|');
  });
});

// ── Exported utility functions ──

describe('exported utilities', () => {
  it('normalizeOutput works', () => {
    expect(normalizeOutput('hello')).toEqual({ text: 'hello' });
  });

  it('enrichOutput works', () => {
    const result = enrichOutput({ text: 'hello' });
    expect(result.tokens).toBeDefined();
  });

  it('jaccardSimilarity works', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  it('computeLengthStats works', () => {
    const stats = computeLengthStats('Hello world.');
    expect(stats.words).toBe(2);
    expect(stats.sentences).toBe(1);
    expect(stats.characters).toBe(12);
  });

  it('estimateCost works', () => {
    expect(estimateCost({ text: 'test' })).toBeUndefined();
  });

  it('getModelPricing works', () => {
    const pricing = getModelPricing();
    expect(Object.keys(pricing).length).toBeGreaterThan(0);
  });

  it('diffWords works', () => {
    const result = diffWords('hello world', 'hello earth');
    expect(result.length).toBeGreaterThan(0);
  });

  it('diffLines works', () => {
    const result = diffLines('line1\nline2', 'line1\nline3');
    expect(result.length).toBeGreaterThan(0);
  });

  it('diffJson works', () => {
    const result = diffJson({ a: 1 }, { a: 2 });
    expect(result.length).toBe(1);
  });

  it('tryParseJson works', () => {
    expect(tryParseJson('{"a": 1}')).toEqual({ a: 1 });
    expect(tryParseJson('not json')).toBeNull();
  });
});

// ── Edge cases ──

describe('edge cases', () => {
  it('handles very long texts', () => {
    const a = 'word '.repeat(1000).trim();
    const b = 'word '.repeat(500).trim() + ' different ' + 'word '.repeat(499).trim();
    const result = diff(a, b);
    expect(result.identical).toBe(false);
    expect(result.metrics.length.a.words).toBe(1000);
  });

  it('handles special characters', () => {
    const result = diff('hello <world> & "friends"', 'hello <earth> & "enemies"');
    expect(result.identical).toBe(false);
  });

  it('handles unicode', () => {
    const result = diff('Hello monde', 'Hello welt');
    expect(result.identical).toBe(false);
  });

  it('handles newlines in various formats', () => {
    const result = diff('line1\nline2', 'line1\nline2\nline3');
    expect(result.identical).toBe(false);
  });

  it('handles mixed string and LLMOutput inputs', () => {
    const result = diff('plain string', { text: 'llm output', model: 'gpt-4o' });
    expect(result.identical).toBe(false);
    expect(result.outputA.model).toBeUndefined();
    expect(result.outputB.model).toBe('gpt-4o');
  });

  it('handles whitespace-only differences', () => {
    const result = diff('hello world', 'hello  world');
    expect(result.identical).toBe(false);
  });

  it('Jaccard similarity is 1.0 for same words different order', () => {
    const result = diff(
      'Paris is the capital of France',
      'The capital of France is Paris',
    );
    expect(result.similarity.jaccard).toBe(1.0);
  });
});
