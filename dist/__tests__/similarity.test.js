"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const similarity_1 = require("../similarity");
// ── tokenize ──
(0, vitest_1.describe)('tokenize', () => {
    (0, vitest_1.it)('lowercases and removes punctuation', () => {
        const result = (0, similarity_1.tokenize)('Hello, World!');
        (0, vitest_1.expect)(result).toEqual(['hello', 'world']);
    });
    (0, vitest_1.it)('handles empty string', () => {
        (0, vitest_1.expect)((0, similarity_1.tokenize)('')).toEqual([]);
    });
    (0, vitest_1.it)('handles only punctuation', () => {
        (0, vitest_1.expect)((0, similarity_1.tokenize)('!@#$%')).toEqual([]);
    });
    (0, vitest_1.it)('handles multiple spaces', () => {
        const result = (0, similarity_1.tokenize)('hello   world');
        (0, vitest_1.expect)(result).toEqual(['hello', 'world']);
    });
    (0, vitest_1.it)('preserves numbers', () => {
        const result = (0, similarity_1.tokenize)('item 42 is good');
        (0, vitest_1.expect)(result).toEqual(['item', '42', 'is', 'good']);
    });
});
// ── jaccardSimilarity ──
(0, vitest_1.describe)('jaccardSimilarity', () => {
    (0, vitest_1.it)('returns 1.0 for identical texts', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('hello world', 'hello world')).toBe(1.0);
    });
    (0, vitest_1.it)('returns 1.0 for two empty strings', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('', '')).toBe(1.0);
    });
    (0, vitest_1.it)('returns 0.0 for completely different texts', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('foo bar', 'baz qux')).toBe(0.0);
    });
    (0, vitest_1.it)('returns 0.0 when one string is empty', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('hello', '')).toBe(0.0);
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('', 'hello')).toBe(0.0);
    });
    (0, vitest_1.it)('returns 1.0 for same words in different order', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('hello world', 'world hello')).toBe(1.0);
    });
    (0, vitest_1.it)('handles partial overlap', () => {
        const score = (0, similarity_1.jaccardSimilarity)('the quick brown fox', 'the slow brown cat');
        // Shared: the, brown (2 words); Union: the, quick, brown, fox, slow, cat (6 words)
        (0, vitest_1.expect)(score).toBeCloseTo(2 / 6, 5);
    });
    (0, vitest_1.it)('is case insensitive', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('Hello World', 'hello world')).toBe(1.0);
    });
    (0, vitest_1.it)('ignores punctuation', () => {
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('hello, world!', 'hello world')).toBe(1.0);
    });
    (0, vitest_1.it)('handles repeated words', () => {
        // Jaccard uses sets, so repeated words don't matter
        (0, vitest_1.expect)((0, similarity_1.jaccardSimilarity)('hello hello hello', 'hello')).toBe(1.0);
    });
    (0, vitest_1.it)('computes correct score for overlapping sets', () => {
        // A = {a, b, c}, B = {b, c, d} => intersection = {b,c} = 2, union = {a,b,c,d} = 4
        const score = (0, similarity_1.jaccardSimilarity)('a b c', 'b c d');
        (0, vitest_1.expect)(score).toBeCloseTo(0.5, 5);
    });
});
// ── cosineSimilarity ──
(0, vitest_1.describe)('cosineSimilarity', () => {
    (0, vitest_1.it)('returns 1.0 for identical texts', () => {
        (0, vitest_1.expect)((0, similarity_1.cosineSimilarity)('hello world', 'hello world')).toBeCloseTo(1.0, 5);
    });
    (0, vitest_1.it)('returns 1.0 for two empty strings', () => {
        (0, vitest_1.expect)((0, similarity_1.cosineSimilarity)('', '')).toBe(1.0);
    });
    (0, vitest_1.it)('returns 0.0 for completely different texts', () => {
        (0, vitest_1.expect)((0, similarity_1.cosineSimilarity)('foo bar', 'baz qux')).toBe(0.0);
    });
    (0, vitest_1.it)('returns 0.0 when one string is empty', () => {
        (0, vitest_1.expect)((0, similarity_1.cosineSimilarity)('hello', '')).toBe(0.0);
    });
    (0, vitest_1.it)('handles partial overlap', () => {
        const score = (0, similarity_1.cosineSimilarity)('the cat sat', 'the dog sat');
        (0, vitest_1.expect)(score).toBeGreaterThan(0);
        (0, vitest_1.expect)(score).toBeLessThan(1);
    });
    (0, vitest_1.it)('considers word frequency', () => {
        // "hello hello world" vs "hello world world"
        // A: hello=2, world=1; B: hello=1, world=2
        // dot = 2*1 + 1*2 = 4; normA = sqrt(5); normB = sqrt(5)
        // cosine = 4/5 = 0.8
        const score = (0, similarity_1.cosineSimilarity)('hello hello world', 'hello world world');
        (0, vitest_1.expect)(score).toBeCloseTo(0.8, 5);
    });
});
// ── exactMatchRatio ──
(0, vitest_1.describe)('exactMatchRatio', () => {
    (0, vitest_1.it)('returns 1.0 for identical texts', () => {
        (0, vitest_1.expect)((0, similarity_1.exactMatchRatio)('hello', 'hello')).toBe(1.0);
    });
    (0, vitest_1.it)('returns 0.0 for different texts', () => {
        (0, vitest_1.expect)((0, similarity_1.exactMatchRatio)('hello', 'world')).toBe(0.0);
    });
    (0, vitest_1.it)('returns 1.0 for two empty strings', () => {
        (0, vitest_1.expect)((0, similarity_1.exactMatchRatio)('', '')).toBe(1.0);
    });
    (0, vitest_1.it)('is case sensitive', () => {
        (0, vitest_1.expect)((0, similarity_1.exactMatchRatio)('Hello', 'hello')).toBe(0.0);
    });
});
// ── compositeSimilarity ──
(0, vitest_1.describe)('compositeSimilarity', () => {
    (0, vitest_1.it)('returns 1.0 for identical texts', () => {
        (0, vitest_1.expect)((0, similarity_1.compositeSimilarity)('hello world', 'hello world')).toBeCloseTo(1.0, 5);
    });
    (0, vitest_1.it)('returns value between 0 and 1 for partial similarity', () => {
        const score = (0, similarity_1.compositeSimilarity)('the cat sat on the mat', 'the dog sat on the rug');
        (0, vitest_1.expect)(score).toBeGreaterThan(0);
        (0, vitest_1.expect)(score).toBeLessThan(1);
    });
    (0, vitest_1.it)('returns higher score for more similar texts', () => {
        const score1 = (0, similarity_1.compositeSimilarity)('hello world', 'hello earth');
        const score2 = (0, similarity_1.compositeSimilarity)('hello world', 'goodbye universe');
        (0, vitest_1.expect)(score1).toBeGreaterThan(score2);
    });
});
// ── embeddingCosineSimilarity ──
(0, vitest_1.describe)('embeddingCosineSimilarity', () => {
    (0, vitest_1.it)('returns 1.0 for identical vectors', () => {
        (0, vitest_1.expect)((0, similarity_1.embeddingCosineSimilarity)([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0, 5);
    });
    (0, vitest_1.it)('returns 0.0 for orthogonal vectors', () => {
        (0, vitest_1.expect)((0, similarity_1.embeddingCosineSimilarity)([1, 0], [0, 1])).toBeCloseTo(0.0, 5);
    });
    (0, vitest_1.it)('returns -1.0 for opposite vectors', () => {
        (0, vitest_1.expect)((0, similarity_1.embeddingCosineSimilarity)([1, 0], [-1, 0])).toBeCloseTo(-1.0, 5);
    });
    (0, vitest_1.it)('handles arbitrary vectors', () => {
        const score = (0, similarity_1.embeddingCosineSimilarity)([1, 2, 3], [4, 5, 6]);
        // dot = 32, normA = sqrt(14), normB = sqrt(77)
        (0, vitest_1.expect)(score).toBeCloseTo(32 / (Math.sqrt(14) * Math.sqrt(77)), 5);
    });
    (0, vitest_1.it)('throws for different length vectors', () => {
        (0, vitest_1.expect)(() => (0, similarity_1.embeddingCosineSimilarity)([1, 2], [1, 2, 3])).toThrow();
    });
    (0, vitest_1.it)('returns 0 for zero vectors', () => {
        (0, vitest_1.expect)((0, similarity_1.embeddingCosineSimilarity)([0, 0], [0, 0])).toBe(0);
    });
    (0, vitest_1.it)('returns 1 for empty vectors', () => {
        (0, vitest_1.expect)((0, similarity_1.embeddingCosineSimilarity)([], [])).toBe(1);
    });
});
// ── computeLengthStats ──
(0, vitest_1.describe)('computeLengthStats', () => {
    (0, vitest_1.it)('computes stats for simple text', () => {
        const stats = (0, similarity_1.computeLengthStats)('Hello world. How are you?');
        (0, vitest_1.expect)(stats.words).toBe(5);
        (0, vitest_1.expect)(stats.sentences).toBe(2);
        (0, vitest_1.expect)(stats.characters).toBe(25);
    });
    (0, vitest_1.it)('handles empty string', () => {
        const stats = (0, similarity_1.computeLengthStats)('');
        (0, vitest_1.expect)(stats.words).toBe(0);
        (0, vitest_1.expect)(stats.sentences).toBe(0);
        (0, vitest_1.expect)(stats.characters).toBe(0);
    });
    (0, vitest_1.it)('handles single word', () => {
        const stats = (0, similarity_1.computeLengthStats)('hello');
        (0, vitest_1.expect)(stats.words).toBe(1);
        (0, vitest_1.expect)(stats.sentences).toBe(1); // text with no terminal punctuation counts as 1
        (0, vitest_1.expect)(stats.characters).toBe(5);
    });
    (0, vitest_1.it)('counts sentences correctly with various terminators', () => {
        const stats = (0, similarity_1.computeLengthStats)('First sentence. Second sentence! Third sentence?');
        (0, vitest_1.expect)(stats.sentences).toBe(3);
    });
    (0, vitest_1.it)('handles multiple spaces between words', () => {
        const stats = (0, similarity_1.computeLengthStats)('hello   world');
        (0, vitest_1.expect)(stats.words).toBe(2);
    });
    (0, vitest_1.it)('counts characters including whitespace', () => {
        const stats = (0, similarity_1.computeLengthStats)('a b c');
        (0, vitest_1.expect)(stats.characters).toBe(5);
    });
    (0, vitest_1.it)('handles newlines', () => {
        const stats = (0, similarity_1.computeLengthStats)('hello\nworld');
        (0, vitest_1.expect)(stats.words).toBe(2);
    });
    (0, vitest_1.it)('handles text ending with period', () => {
        const stats = (0, similarity_1.computeLengthStats)('One sentence.');
        (0, vitest_1.expect)(stats.sentences).toBe(1);
    });
});
//# sourceMappingURL=similarity.test.js.map