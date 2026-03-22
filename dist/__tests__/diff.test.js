"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const diff_1 = require("../diff");
const diff_2 = require("../diff");
// ── normalizeOutput ──
(0, vitest_1.describe)('normalizeOutput', () => {
    (0, vitest_1.it)('wraps a plain string into LLMOutput', () => {
        const result = (0, diff_1.normalizeOutput)('hello world');
        (0, vitest_1.expect)(result).toEqual({ text: 'hello world' });
    });
    (0, vitest_1.it)('returns a copy of an LLMOutput object', () => {
        const input = { text: 'hello', model: 'gpt-4o' };
        const result = (0, diff_1.normalizeOutput)(input);
        (0, vitest_1.expect)(result).toEqual(input);
        (0, vitest_1.expect)(result).not.toBe(input); // should be a copy
    });
    (0, vitest_1.it)('preserves all metadata fields', () => {
        const input = {
            text: 'hello',
            model: 'gpt-4o',
            tokens: { input: 10, output: 5 },
            cost: 0.001,
            latency: 500,
            metadata: { version: '2' },
        };
        const result = (0, diff_1.normalizeOutput)(input);
        (0, vitest_1.expect)(result).toEqual(input);
    });
});
// ── estimateTokens ──
(0, vitest_1.describe)('estimateTokens', () => {
    (0, vitest_1.it)('estimates tokens as ceil(length / 4)', () => {
        (0, vitest_1.expect)((0, diff_1.estimateTokens)('hello')).toBe(2); // ceil(5/4)
        (0, vitest_1.expect)((0, diff_1.estimateTokens)('hi')).toBe(1); // ceil(2/4)
        (0, vitest_1.expect)((0, diff_1.estimateTokens)('abcdefgh')).toBe(2); // ceil(8/4)
        (0, vitest_1.expect)((0, diff_1.estimateTokens)('')).toBe(0);
    });
    (0, vitest_1.it)('handles long text', () => {
        const text = 'a'.repeat(1000);
        (0, vitest_1.expect)((0, diff_1.estimateTokens)(text)).toBe(250);
    });
});
// ── enrichOutput ──
(0, vitest_1.describe)('enrichOutput', () => {
    (0, vitest_1.it)('adds estimated output tokens when tokens is missing', () => {
        const result = (0, diff_1.enrichOutput)({ text: 'hello world' });
        (0, vitest_1.expect)(result.tokens).toBeDefined();
        (0, vitest_1.expect)(result.tokens.output).toBe(Math.ceil('hello world'.length / 4));
    });
    (0, vitest_1.it)('adds output tokens when tokens object exists but output is undefined', () => {
        const result = (0, diff_1.enrichOutput)({ text: 'hello world', tokens: { input: 10 } });
        (0, vitest_1.expect)(result.tokens.input).toBe(10);
        (0, vitest_1.expect)(result.tokens.output).toBe(Math.ceil('hello world'.length / 4));
    });
    (0, vitest_1.it)('preserves existing output tokens', () => {
        const result = (0, diff_1.enrichOutput)({ text: 'hello world', tokens: { input: 10, output: 42 } });
        (0, vitest_1.expect)(result.tokens.output).toBe(42);
    });
    (0, vitest_1.it)('does not mutate the original object', () => {
        const original = { text: 'hello' };
        const result = (0, diff_1.enrichOutput)(original);
        (0, vitest_1.expect)(original).not.toHaveProperty('tokens');
        (0, vitest_1.expect)(result.tokens).toBeDefined();
    });
});
// ── tokenizeWords ──
(0, vitest_1.describe)('tokenizeWords', () => {
    (0, vitest_1.it)('splits text into word and whitespace tokens', () => {
        const tokens = (0, diff_1.tokenizeWords)('hello world');
        (0, vitest_1.expect)(tokens).toEqual(['hello', ' ', 'world']);
    });
    (0, vitest_1.it)('handles multiple spaces', () => {
        const tokens = (0, diff_1.tokenizeWords)('hello  world');
        (0, vitest_1.expect)(tokens).toEqual(['hello', '  ', 'world']);
    });
    (0, vitest_1.it)('handles empty string', () => {
        (0, vitest_1.expect)((0, diff_1.tokenizeWords)('')).toEqual([]);
    });
    (0, vitest_1.it)('handles single word', () => {
        (0, vitest_1.expect)((0, diff_1.tokenizeWords)('hello')).toEqual(['hello']);
    });
    (0, vitest_1.it)('handles leading/trailing whitespace', () => {
        const tokens = (0, diff_1.tokenizeWords)(' hello ');
        (0, vitest_1.expect)(tokens).toEqual([' ', 'hello', ' ']);
    });
});
// ── diffWords ──
(0, vitest_1.describe)('diffWords', () => {
    (0, vitest_1.it)('returns empty array for two empty strings', () => {
        (0, vitest_1.expect)((0, diff_2.diffWords)('', '')).toEqual([]);
    });
    (0, vitest_1.it)('returns unchanged for identical strings', () => {
        const result = (0, diff_2.diffWords)('hello world', 'hello world');
        (0, vitest_1.expect)(result).toEqual([{ text: 'hello world', type: 'unchanged' }]);
    });
    (0, vitest_1.it)('detects added text', () => {
        const result = (0, diff_2.diffWords)('', 'hello');
        (0, vitest_1.expect)(result).toEqual([{ text: 'hello', type: 'added' }]);
    });
    (0, vitest_1.it)('detects removed text', () => {
        const result = (0, diff_2.diffWords)('hello', '');
        (0, vitest_1.expect)(result).toEqual([{ text: 'hello', type: 'removed' }]);
    });
    (0, vitest_1.it)('detects word-level changes', () => {
        const result = (0, diff_2.diffWords)('hello world', 'hello earth');
        // Should have: unchanged 'hello ', removed 'world', added 'earth'
        const types = result.map(s => s.type);
        (0, vitest_1.expect)(types).toContain('unchanged');
        (0, vitest_1.expect)(types).toContain('removed');
        (0, vitest_1.expect)(types).toContain('added');
    });
    (0, vitest_1.it)('handles completely different texts', () => {
        const result = (0, diff_2.diffWords)('foo bar', 'baz qux');
        const removed = result.filter(s => s.type === 'removed');
        const added = result.filter(s => s.type === 'added');
        (0, vitest_1.expect)(removed.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(added.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles partial overlaps', () => {
        const result = (0, diff_2.diffWords)('the quick brown fox', 'the slow brown cat');
        const unchanged = result.filter(s => s.type === 'unchanged');
        // 'the' and 'brown' should be unchanged
        const unchangedText = unchanged.map(s => s.text.trim()).join(' ');
        (0, vitest_1.expect)(unchangedText).toContain('the');
        (0, vitest_1.expect)(unchangedText).toContain('brown');
    });
});
// ── diffLines ──
(0, vitest_1.describe)('diffLines', () => {
    (0, vitest_1.it)('returns empty for identical strings', () => {
        const result = (0, diff_2.diffLines)('hello', 'hello');
        (0, vitest_1.expect)(result).toEqual([{ text: 'hello', type: 'unchanged' }]);
    });
    (0, vitest_1.it)('detects added lines', () => {
        const result = (0, diff_2.diffLines)('line1', 'line1\nline2');
        const added = result.filter(s => s.type === 'added');
        (0, vitest_1.expect)(added.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('detects removed lines', () => {
        const result = (0, diff_2.diffLines)('line1\nline2', 'line1');
        const removed = result.filter(s => s.type === 'removed');
        (0, vitest_1.expect)(removed.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles multi-line diffs', () => {
        const a = 'line1\nline2\nline3';
        const b = 'line1\nline2-modified\nline3';
        const result = (0, diff_2.diffLines)(a, b);
        (0, vitest_1.expect)(result.length).toBeGreaterThan(1);
    });
});
// ── computeHunks ──
(0, vitest_1.describe)('computeHunks', () => {
    (0, vitest_1.it)('returns empty array for identical texts', () => {
        (0, vitest_1.expect)((0, diff_1.computeHunks)('hello', 'hello')).toEqual([]);
    });
    (0, vitest_1.it)('produces hunks for different texts', () => {
        const a = 'line1\nline2\nline3';
        const b = 'line1\nmodified\nline3';
        const hunks = (0, diff_1.computeHunks)(a, b);
        (0, vitest_1.expect)(hunks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(hunks[0].segments.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('hunks have valid line numbers', () => {
        const a = 'line1\nline2\nline3\nline4\nline5';
        const b = 'line1\nline2\nchanged\nline4\nline5';
        const hunks = (0, diff_1.computeHunks)(a, b, 1);
        (0, vitest_1.expect)(hunks.length).toBeGreaterThan(0);
        for (const hunk of hunks) {
            (0, vitest_1.expect)(hunk.lineA).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(hunk.lineB).toBeGreaterThanOrEqual(1);
        }
    });
    (0, vitest_1.it)('respects contextLines parameter', () => {
        const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
        const a = lines.join('\n');
        const b = [...lines.slice(0, 9), 'changed', ...lines.slice(10)].join('\n');
        const hunks0 = (0, diff_1.computeHunks)(a, b, 0);
        const hunks5 = (0, diff_1.computeHunks)(a, b, 5);
        // With more context, the hunk should include more segments
        const segs0 = hunks0.reduce((acc, h) => acc + h.segments.length, 0);
        const segs5 = hunks5.reduce((acc, h) => acc + h.segments.length, 0);
        (0, vitest_1.expect)(segs5).toBeGreaterThanOrEqual(segs0);
    });
    (0, vitest_1.it)('handles addition of new lines', () => {
        const a = 'line1\nline2';
        const b = 'line1\nline2\nline3';
        const hunks = (0, diff_1.computeHunks)(a, b);
        const addedSegments = hunks.flatMap(h => h.segments.filter(s => s.type === 'added'));
        (0, vitest_1.expect)(addedSegments.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles removal of lines', () => {
        const a = 'line1\nline2\nline3';
        const b = 'line1\nline3';
        const hunks = (0, diff_1.computeHunks)(a, b);
        const removedSegments = hunks.flatMap(h => h.segments.filter(s => s.type === 'removed'));
        (0, vitest_1.expect)(removedSegments.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('handles completely different texts', () => {
        const hunks = (0, diff_1.computeHunks)('foo\nbar', 'baz\nqux');
        (0, vitest_1.expect)(hunks.length).toBeGreaterThan(0);
    });
});
// ── diffJson ──
(0, vitest_1.describe)('diffJson', () => {
    (0, vitest_1.it)('returns empty for identical objects', () => {
        const obj = { a: 1, b: 'hello' };
        (0, vitest_1.expect)((0, diff_2.diffJson)(obj, { ...obj })).toEqual([]);
    });
    (0, vitest_1.it)('detects added keys', () => {
        const a = { foo: 1 };
        const b = { foo: 1, bar: 2 };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'bar', type: 'added', after: 2 },
        ]);
    });
    (0, vitest_1.it)('detects removed keys', () => {
        const a = { foo: 1, bar: 2 };
        const b = { foo: 1 };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'bar', type: 'removed', before: 2 },
        ]);
    });
    (0, vitest_1.it)('detects changed values', () => {
        const a = { foo: 1 };
        const b = { foo: 2 };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'foo', type: 'changed', before: 1, after: 2 },
        ]);
    });
    (0, vitest_1.it)('handles nested objects', () => {
        const a = { outer: { inner: 1 } };
        const b = { outer: { inner: 2 } };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'outer.inner', type: 'changed', before: 1, after: 2 },
        ]);
    });
    (0, vitest_1.it)('handles arrays', () => {
        const a = { items: [1, 2, 3] };
        const b = { items: [1, 2, 3, 4] };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toContainEqual({ path: 'items[3]', type: 'added', after: 4 });
    });
    (0, vitest_1.it)('handles array element changes', () => {
        const a = [1, 2, 3];
        const b = [1, 99, 3];
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toContainEqual({ path: '[1]', type: 'changed', before: 2, after: 99 });
    });
    (0, vitest_1.it)('handles array element removal', () => {
        const a = [1, 2, 3];
        const b = [1, 2];
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toContainEqual({ path: '[2]', type: 'removed', before: 3 });
    });
    (0, vitest_1.it)('handles deeply nested structures', () => {
        const a = { level1: { level2: { level3: 'old' } } };
        const b = { level1: { level2: { level3: 'new' } } };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'level1.level2.level3', type: 'changed', before: 'old', after: 'new' },
        ]);
    });
    (0, vitest_1.it)('handles mixed additions and removals', () => {
        const a = { keep: 1, remove: 2 };
        const b = { keep: 1, add: 3 };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes.length).toBe(2);
        (0, vitest_1.expect)(changes.find(c => c.type === 'removed')).toBeDefined();
        (0, vitest_1.expect)(changes.find(c => c.type === 'added')).toBeDefined();
    });
    (0, vitest_1.it)('handles type changes', () => {
        const a = { val: 'string' };
        const b = { val: 42 };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'val', type: 'changed', before: 'string', after: 42 },
        ]);
    });
    (0, vitest_1.it)('handles null values', () => {
        const a = { val: null };
        const b = { val: 'hello' };
        const changes = (0, diff_2.diffJson)(a, b);
        (0, vitest_1.expect)(changes).toEqual([
            { path: 'val', type: 'changed', before: null, after: 'hello' },
        ]);
    });
});
//# sourceMappingURL=diff.test.js.map