import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  cosineSimilarity,
  exactMatchRatio,
  compositeSimilarity,
  embeddingCosineSimilarity,
  computeLengthStats,
  tokenize,
} from '../similarity';

// ── tokenize ──

describe('tokenize', () => {
  it('lowercases and removes punctuation', () => {
    const result = tokenize('Hello, World!');
    expect(result).toEqual(['hello', 'world']);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles only punctuation', () => {
    expect(tokenize('!@#$%')).toEqual([]);
  });

  it('handles multiple spaces', () => {
    const result = tokenize('hello   world');
    expect(result).toEqual(['hello', 'world']);
  });

  it('preserves numbers', () => {
    const result = tokenize('item 42 is good');
    expect(result).toEqual(['item', '42', 'is', 'good']);
  });
});

// ── jaccardSimilarity ──

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical texts', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(1.0);
  });

  it('returns 0.0 for completely different texts', () => {
    expect(jaccardSimilarity('foo bar', 'baz qux')).toBe(0.0);
  });

  it('returns 0.0 when one string is empty', () => {
    expect(jaccardSimilarity('hello', '')).toBe(0.0);
    expect(jaccardSimilarity('', 'hello')).toBe(0.0);
  });

  it('returns 1.0 for same words in different order', () => {
    expect(jaccardSimilarity('hello world', 'world hello')).toBe(1.0);
  });

  it('handles partial overlap', () => {
    const score = jaccardSimilarity('the quick brown fox', 'the slow brown cat');
    // Shared: the, brown (2 words); Union: the, quick, brown, fox, slow, cat (6 words)
    expect(score).toBeCloseTo(2 / 6, 5);
  });

  it('is case insensitive', () => {
    expect(jaccardSimilarity('Hello World', 'hello world')).toBe(1.0);
  });

  it('ignores punctuation', () => {
    expect(jaccardSimilarity('hello, world!', 'hello world')).toBe(1.0);
  });

  it('handles repeated words', () => {
    // Jaccard uses sets, so repeated words don't matter
    expect(jaccardSimilarity('hello hello hello', 'hello')).toBe(1.0);
  });

  it('computes correct score for overlapping sets', () => {
    // A = {a, b, c}, B = {b, c, d} => intersection = {b,c} = 2, union = {a,b,c,d} = 4
    const score = jaccardSimilarity('a b c', 'b c d');
    expect(score).toBeCloseTo(0.5, 5);
  });
});

// ── cosineSimilarity ──

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical texts', () => {
    expect(cosineSimilarity('hello world', 'hello world')).toBeCloseTo(1.0, 5);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(cosineSimilarity('', '')).toBe(1.0);
  });

  it('returns 0.0 for completely different texts', () => {
    expect(cosineSimilarity('foo bar', 'baz qux')).toBe(0.0);
  });

  it('returns 0.0 when one string is empty', () => {
    expect(cosineSimilarity('hello', '')).toBe(0.0);
  });

  it('handles partial overlap', () => {
    const score = cosineSimilarity('the cat sat', 'the dog sat');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('considers word frequency', () => {
    // "hello hello world" vs "hello world world"
    // A: hello=2, world=1; B: hello=1, world=2
    // dot = 2*1 + 1*2 = 4; normA = sqrt(5); normB = sqrt(5)
    // cosine = 4/5 = 0.8
    const score = cosineSimilarity('hello hello world', 'hello world world');
    expect(score).toBeCloseTo(0.8, 5);
  });
});

// ── exactMatchRatio ──

describe('exactMatchRatio', () => {
  it('returns 1.0 for identical texts', () => {
    expect(exactMatchRatio('hello', 'hello')).toBe(1.0);
  });

  it('returns 0.0 for different texts', () => {
    expect(exactMatchRatio('hello', 'world')).toBe(0.0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(exactMatchRatio('', '')).toBe(1.0);
  });

  it('is case sensitive', () => {
    expect(exactMatchRatio('Hello', 'hello')).toBe(0.0);
  });
});

// ── compositeSimilarity ──

describe('compositeSimilarity', () => {
  it('returns 1.0 for identical texts', () => {
    expect(compositeSimilarity('hello world', 'hello world')).toBeCloseTo(1.0, 5);
  });

  it('returns value between 0 and 1 for partial similarity', () => {
    const score = compositeSimilarity('the cat sat on the mat', 'the dog sat on the rug');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns higher score for more similar texts', () => {
    const score1 = compositeSimilarity('hello world', 'hello earth');
    const score2 = compositeSimilarity('hello world', 'goodbye universe');
    expect(score1).toBeGreaterThan(score2);
  });
});

// ── embeddingCosineSimilarity ──

describe('embeddingCosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    expect(embeddingCosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0, 5);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    expect(embeddingCosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 5);
  });

  it('returns -1.0 for opposite vectors', () => {
    expect(embeddingCosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0, 5);
  });

  it('handles arbitrary vectors', () => {
    const score = embeddingCosineSimilarity([1, 2, 3], [4, 5, 6]);
    // dot = 32, normA = sqrt(14), normB = sqrt(77)
    expect(score).toBeCloseTo(32 / (Math.sqrt(14) * Math.sqrt(77)), 5);
  });

  it('throws for different length vectors', () => {
    expect(() => embeddingCosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });

  it('returns 0 for zero vectors', () => {
    expect(embeddingCosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('returns 0 for empty vectors', () => {
    expect(embeddingCosineSimilarity([], [])).toBe(0);
  });
});

// ── computeLengthStats ──

describe('computeLengthStats', () => {
  it('computes stats for simple text', () => {
    const stats = computeLengthStats('Hello world. How are you?');
    expect(stats.words).toBe(5);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBe(25);
  });

  it('handles empty string', () => {
    const stats = computeLengthStats('');
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.characters).toBe(0);
  });

  it('handles single word', () => {
    const stats = computeLengthStats('hello');
    expect(stats.words).toBe(1);
    expect(stats.sentences).toBe(1); // text with no terminal punctuation counts as 1
    expect(stats.characters).toBe(5);
  });

  it('counts sentences correctly with various terminators', () => {
    const stats = computeLengthStats('First sentence. Second sentence! Third sentence?');
    expect(stats.sentences).toBe(3);
  });

  it('handles multiple spaces between words', () => {
    const stats = computeLengthStats('hello   world');
    expect(stats.words).toBe(2);
  });

  it('counts characters including whitespace', () => {
    const stats = computeLengthStats('a b c');
    expect(stats.characters).toBe(5);
  });

  it('handles newlines', () => {
    const stats = computeLengthStats('hello\nworld');
    expect(stats.words).toBe(2);
  });

  it('handles text ending with period', () => {
    const stats = computeLengthStats('One sentence.');
    expect(stats.sentences).toBe(1);
  });
});
