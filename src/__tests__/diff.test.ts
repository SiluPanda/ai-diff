import { describe, it, expect } from 'vitest';
import {
  normalizeOutput,
  enrichOutput,
  estimateTokens,
  tokenizeWords,
  computeHunks,
} from '../diff';
import { diffWords, diffLines, diffJson } from '../diff';

// ── normalizeOutput ──

describe('normalizeOutput', () => {
  it('wraps a plain string into LLMOutput', () => {
    const result = normalizeOutput('hello world');
    expect(result).toEqual({ text: 'hello world' });
  });

  it('returns a copy of an LLMOutput object', () => {
    const input = { text: 'hello', model: 'gpt-4o' };
    const result = normalizeOutput(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input); // should be a copy
  });

  it('preserves all metadata fields', () => {
    const input = {
      text: 'hello',
      model: 'gpt-4o',
      tokens: { input: 10, output: 5 },
      cost: 0.001,
      latency: 500,
      metadata: { version: '2' },
    };
    const result = normalizeOutput(input);
    expect(result).toEqual(input);
  });
});

// ── estimateTokens ──

describe('estimateTokens', () => {
  it('estimates tokens as ceil(length / 4)', () => {
    expect(estimateTokens('hello')).toBe(2); // ceil(5/4)
    expect(estimateTokens('hi')).toBe(1);    // ceil(2/4)
    expect(estimateTokens('abcdefgh')).toBe(2); // ceil(8/4)
    expect(estimateTokens('')).toBe(0);
  });

  it('handles long text', () => {
    const text = 'a'.repeat(1000);
    expect(estimateTokens(text)).toBe(250);
  });
});

// ── enrichOutput ──

describe('enrichOutput', () => {
  it('adds estimated output tokens when tokens is missing', () => {
    const result = enrichOutput({ text: 'hello world' });
    expect(result.tokens).toBeDefined();
    expect(result.tokens!.output).toBe(Math.ceil('hello world'.length / 4));
  });

  it('adds output tokens when tokens object exists but output is undefined', () => {
    const result = enrichOutput({ text: 'hello world', tokens: { input: 10 } });
    expect(result.tokens!.input).toBe(10);
    expect(result.tokens!.output).toBe(Math.ceil('hello world'.length / 4));
  });

  it('preserves existing output tokens', () => {
    const result = enrichOutput({ text: 'hello world', tokens: { input: 10, output: 42 } });
    expect(result.tokens!.output).toBe(42);
  });

  it('does not mutate the original object', () => {
    const original = { text: 'hello' };
    const result = enrichOutput(original);
    expect(original).not.toHaveProperty('tokens');
    expect(result.tokens).toBeDefined();
  });
});

// ── tokenizeWords ──

describe('tokenizeWords', () => {
  it('splits text into word and whitespace tokens', () => {
    const tokens = tokenizeWords('hello world');
    expect(tokens).toEqual(['hello', ' ', 'world']);
  });

  it('handles multiple spaces', () => {
    const tokens = tokenizeWords('hello  world');
    expect(tokens).toEqual(['hello', '  ', 'world']);
  });

  it('handles empty string', () => {
    expect(tokenizeWords('')).toEqual([]);
  });

  it('handles single word', () => {
    expect(tokenizeWords('hello')).toEqual(['hello']);
  });

  it('handles leading/trailing whitespace', () => {
    const tokens = tokenizeWords(' hello ');
    expect(tokens).toEqual([' ', 'hello', ' ']);
  });
});

// ── diffWords ──

describe('diffWords', () => {
  it('returns empty array for two empty strings', () => {
    expect(diffWords('', '')).toEqual([]);
  });

  it('returns unchanged for identical strings', () => {
    const result = diffWords('hello world', 'hello world');
    expect(result).toEqual([{ text: 'hello world', type: 'unchanged' }]);
  });

  it('detects added text', () => {
    const result = diffWords('', 'hello');
    expect(result).toEqual([{ text: 'hello', type: 'added' }]);
  });

  it('detects removed text', () => {
    const result = diffWords('hello', '');
    expect(result).toEqual([{ text: 'hello', type: 'removed' }]);
  });

  it('detects word-level changes', () => {
    const result = diffWords('hello world', 'hello earth');
    // Should have: unchanged 'hello ', removed 'world', added 'earth'
    const types = result.map(s => s.type);
    expect(types).toContain('unchanged');
    expect(types).toContain('removed');
    expect(types).toContain('added');
  });

  it('handles completely different texts', () => {
    const result = diffWords('foo bar', 'baz qux');
    const removed = result.filter(s => s.type === 'removed');
    const added = result.filter(s => s.type === 'added');
    expect(removed.length).toBeGreaterThan(0);
    expect(added.length).toBeGreaterThan(0);
  });

  it('handles partial overlaps', () => {
    const result = diffWords('the quick brown fox', 'the slow brown cat');
    const unchanged = result.filter(s => s.type === 'unchanged');
    // 'the' and 'brown' should be unchanged
    const unchangedText = unchanged.map(s => s.text.trim()).join(' ');
    expect(unchangedText).toContain('the');
    expect(unchangedText).toContain('brown');
  });
});

// ── diffLines ──

describe('diffLines', () => {
  it('returns empty for identical strings', () => {
    const result = diffLines('hello', 'hello');
    expect(result).toEqual([{ text: 'hello', type: 'unchanged' }]);
  });

  it('detects added lines', () => {
    const result = diffLines('line1', 'line1\nline2');
    const added = result.filter(s => s.type === 'added');
    expect(added.length).toBeGreaterThan(0);
  });

  it('detects removed lines', () => {
    const result = diffLines('line1\nline2', 'line1');
    const removed = result.filter(s => s.type === 'removed');
    expect(removed.length).toBeGreaterThan(0);
  });

  it('handles multi-line diffs', () => {
    const a = 'line1\nline2\nline3';
    const b = 'line1\nline2-modified\nline3';
    const result = diffLines(a, b);
    expect(result.length).toBeGreaterThan(1);
  });
});

// ── computeHunks ──

describe('computeHunks', () => {
  it('returns empty array for identical texts', () => {
    expect(computeHunks('hello', 'hello')).toEqual([]);
  });

  it('produces hunks for different texts', () => {
    const a = 'line1\nline2\nline3';
    const b = 'line1\nmodified\nline3';
    const hunks = computeHunks(a, b);
    expect(hunks.length).toBeGreaterThan(0);
    expect(hunks[0].segments.length).toBeGreaterThan(0);
  });

  it('hunks have valid line numbers', () => {
    const a = 'line1\nline2\nline3\nline4\nline5';
    const b = 'line1\nline2\nchanged\nline4\nline5';
    const hunks = computeHunks(a, b, 1);
    expect(hunks.length).toBeGreaterThan(0);
    for (const hunk of hunks) {
      expect(hunk.lineA).toBeGreaterThanOrEqual(1);
      expect(hunk.lineB).toBeGreaterThanOrEqual(1);
    }
  });

  it('respects contextLines parameter', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
    const a = lines.join('\n');
    const b = [...lines.slice(0, 9), 'changed', ...lines.slice(10)].join('\n');
    const hunks0 = computeHunks(a, b, 0);
    const hunks5 = computeHunks(a, b, 5);

    // With more context, the hunk should include more segments
    const segs0 = hunks0.reduce((acc, h) => acc + h.segments.length, 0);
    const segs5 = hunks5.reduce((acc, h) => acc + h.segments.length, 0);
    expect(segs5).toBeGreaterThanOrEqual(segs0);
  });

  it('handles addition of new lines', () => {
    const a = 'line1\nline2';
    const b = 'line1\nline2\nline3';
    const hunks = computeHunks(a, b);
    const addedSegments = hunks.flatMap(h => h.segments.filter(s => s.type === 'added'));
    expect(addedSegments.length).toBeGreaterThan(0);
  });

  it('handles removal of lines', () => {
    const a = 'line1\nline2\nline3';
    const b = 'line1\nline3';
    const hunks = computeHunks(a, b);
    const removedSegments = hunks.flatMap(h => h.segments.filter(s => s.type === 'removed'));
    expect(removedSegments.length).toBeGreaterThan(0);
  });

  it('handles completely different texts', () => {
    const hunks = computeHunks('foo\nbar', 'baz\nqux');
    expect(hunks.length).toBeGreaterThan(0);
  });
});

// ── diffJson ──

describe('diffJson', () => {
  it('returns empty for identical objects', () => {
    const obj = { a: 1, b: 'hello' };
    expect(diffJson(obj, { ...obj })).toEqual([]);
  });

  it('detects added keys', () => {
    const a = { foo: 1 };
    const b = { foo: 1, bar: 2 };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'bar', type: 'added', after: 2 },
    ]);
  });

  it('detects removed keys', () => {
    const a = { foo: 1, bar: 2 };
    const b = { foo: 1 };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'bar', type: 'removed', before: 2 },
    ]);
  });

  it('detects changed values', () => {
    const a = { foo: 1 };
    const b = { foo: 2 };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'foo', type: 'changed', before: 1, after: 2 },
    ]);
  });

  it('handles nested objects', () => {
    const a = { outer: { inner: 1 } };
    const b = { outer: { inner: 2 } };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'outer.inner', type: 'changed', before: 1, after: 2 },
    ]);
  });

  it('handles arrays', () => {
    const a = { items: [1, 2, 3] };
    const b = { items: [1, 2, 3, 4] };
    const changes = diffJson(a, b);
    expect(changes).toContainEqual(
      { path: 'items[3]', type: 'added', after: 4 },
    );
  });

  it('handles array element changes', () => {
    const a = [1, 2, 3];
    const b = [1, 99, 3];
    const changes = diffJson(a, b);
    expect(changes).toContainEqual(
      { path: '[1]', type: 'changed', before: 2, after: 99 },
    );
  });

  it('handles array element removal', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    const changes = diffJson(a, b);
    expect(changes).toContainEqual(
      { path: '[2]', type: 'removed', before: 3 },
    );
  });

  it('handles deeply nested structures', () => {
    const a = { level1: { level2: { level3: 'old' } } };
    const b = { level1: { level2: { level3: 'new' } } };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'level1.level2.level3', type: 'changed', before: 'old', after: 'new' },
    ]);
  });

  it('handles mixed additions and removals', () => {
    const a = { keep: 1, remove: 2 };
    const b = { keep: 1, add: 3 };
    const changes = diffJson(a, b);
    expect(changes.length).toBe(2);
    expect(changes.find(c => c.type === 'removed')).toBeDefined();
    expect(changes.find(c => c.type === 'added')).toBeDefined();
  });

  it('handles type changes', () => {
    const a = { val: 'string' };
    const b = { val: 42 };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'val', type: 'changed', before: 'string', after: 42 },
    ]);
  });

  it('handles null values', () => {
    const a = { val: null };
    const b = { val: 'hello' };
    const changes = diffJson(a, b);
    expect(changes).toEqual([
      { path: 'val', type: 'changed', before: null, after: 'hello' },
    ]);
  });
});
