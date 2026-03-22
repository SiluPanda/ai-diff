# ai-diff

Compare LLM outputs with word-level and line-level diffs, ANSI-colored terminal output, and AI-specific metrics.

[![npm version](https://img.shields.io/npm/v/ai-diff.svg)](https://www.npmjs.com/package/ai-diff)
[![npm downloads](https://img.shields.io/npm/dt/ai-diff.svg)](https://www.npmjs.com/package/ai-diff)
[![license](https://img.shields.io/npm/l/ai-diff.svg)](https://github.com/SiluPanda/ai-diff/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/ai-diff.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

`ai-diff` compares two or more LLM responses and produces structured diffs annotated with AI-specific metrics: token counts (input and output), estimated cost in USD (using built-in model pricing), response latency, Jaccard similarity scores, and length statistics (words, sentences, characters). It supports five diff modes -- unified, side-by-side, inline, metrics-only, and JSON structural diff -- and four output formats: terminal (ANSI-colored), JSON, Markdown, and plain text. Zero runtime dependencies.

## Installation

```bash
npm install ai-diff
```

## Quick Start

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(
  { text: 'Paris is the capital of France.', model: 'gpt-4o', tokens: { input: 10, output: 8 }, latency: 1240 },
  { text: 'The capital of France is Paris.', model: 'claude-sonnet', tokens: { input: 10, output: 8 }, latency: 980 },
);

// Print a colored unified diff with metrics table
console.log(formatDiff(result, 'terminal'));

// Access structured data
console.log(result.identical);              // false
console.log(result.similarity.jaccard);     // 0.0 - 1.0
console.log(result.metrics.latency?.delta); // -260
```

## Features

- **Word-level and line-level diffs** -- LCS-based algorithms implemented from scratch, no runtime dependencies.
- **Five diff modes** -- `unified` (git-style), `side-by-side` (two-column), `inline` (strikethrough/underline), `metrics` (table only), `json` (structural key-level diff).
- **AI-specific metrics** -- Token counts, estimated cost (USD), response latency, Jaccard similarity, word/sentence/character counts displayed in a comparison table alongside every diff.
- **Built-in model pricing** -- GPT-4o, GPT-4o-mini, GPT-3.5 Turbo, GPT-4 Turbo, Claude Opus, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash. Override or extend with custom pricing.
- **N-way comparison** -- `diffOutputs()` compares any number of outputs pairwise. `compare()` sends a prompt to multiple models via a user-provided function and diffs the results.
- **Four output formats** -- `terminal` (ANSI colors), `json` (serialized result), `markdown`, `plain`.
- **Automatic token estimation** -- When token counts are not provided, output tokens are estimated using a `ceil(characters / 4)` heuristic.
- **ANSI color detection** -- Colors are enabled automatically when stdout is a TTY. Respects `NO_COLOR` environment variable. Override with the `color` option.
- **TypeScript-first** -- Full type definitions exported for all interfaces, options, and result types. Strict mode enabled.
- **Zero runtime dependencies** -- All diffing, similarity, formatting, and metrics logic uses only Node.js built-ins.

## API Reference

### `diff(outputA, outputB, options?)`

Compare two LLM outputs and return a `DiffResult`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `outputA` | `string \| LLMOutput` | First LLM output. Plain strings are wrapped as `{ text: string }`. |
| `outputB` | `string \| LLMOutput` | Second LLM output. |
| `options` | `DiffOptions` | Optional configuration (see [Configuration](#configuration)). |

**Returns:** `DiffResult`

```typescript
import { diff } from 'ai-diff';

// Compare plain strings
const result = diff('Output from model A', 'Output from model B');

// Compare with full metadata
const result = diff(
  { text: 'Response A', model: 'gpt-4o', tokens: { input: 100, output: 50 }, cost: 0.005, latency: 1200 },
  { text: 'Response B', model: 'claude-sonnet', tokens: { input: 100, output: 75 }, latency: 980 },
  { mode: 'side-by-side' },
);

console.log(result.identical);          // false
console.log(result.hunks.length);       // number of diff hunks
console.log(result.metrics.cost);       // { a, b, delta, deltaPercent }
console.log(result.similarity.jaccard); // 0.0 - 1.0
```

---

### `diffOutputs(outputs, options?)`

Compare N LLM outputs pairwise.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `outputs` | `(string \| LLMOutput)[]` | Array of outputs to compare. |
| `options` | `DiffOptions` | Optional configuration. |

**Returns:** `MultiDiffResult`

```typescript
import { diffOutputs } from 'ai-diff';

const result = diffOutputs([
  { text: 'Output A', model: 'gpt-4o' },
  { text: 'Output B', model: 'claude-sonnet' },
  { text: 'Output C', model: 'gemini-pro' },
]);

console.log(result.pairwise.length); // 3 (A-B, A-C, B-C)
console.log(result.metricsTable.labels); // ['gpt-4o', 'claude-sonnet', 'gemini-pro']
console.log(result.metricsTable.wordCounts); // [n, n, n]
```

---

### `compare(prompt, models, llmFn, options?)`

Send a prompt to multiple models via a user-provided function and compare the outputs.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `string` | The prompt to send to each model. |
| `models` | `string[]` | Array of model identifiers. |
| `llmFn` | `LLMFn` | Async function `(prompt, model) => LLMOutput \| string` that calls the model. |
| `options` | `CompareOptions` | Optional configuration (extends `DiffOptions` with `concurrency`, `timeout`, `signal`). |

**Returns:** `Promise<ComparisonResult>`

```typescript
import { compare } from 'ai-diff';

const result = await compare(
  'Explain quantum computing in 3 sentences.',
  ['gpt-4o', 'claude-sonnet'],
  async (prompt, model) => {
    const response = await callMyLLM(prompt, model);
    return { text: response.text, tokens: response.usage, model };
  },
  { concurrency: 2, timeout: 15000 },
);

console.log(result.calls); // per-model status, output, latency, or error
console.log(result.pairwise); // pairwise diffs of successful outputs
```

---

### `formatDiff(result, format?)`

Format a diff result into a displayable string.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `result` | `DiffResult \| MultiDiffResult \| ComparisonResult` | -- | The result to format. |
| `format` | `OutputFormat` | `'terminal'` | One of `'terminal'`, `'json'`, `'markdown'`, `'plain'`. |

**Returns:** `string`

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff('hello world', 'hello earth');

console.log(formatDiff(result, 'terminal'));  // ANSI-colored unified diff
console.log(formatDiff(result, 'json'));      // JSON.stringify(result, null, 2)
console.log(formatDiff(result, 'plain'));     // plain text, no ANSI codes
```

---

### Similarity Functions

#### `jaccardSimilarity(textA, textB)`

Compute Jaccard similarity (word-level set overlap) between two texts. Returns a value between 0.0 and 1.0.

```typescript
import { jaccardSimilarity } from 'ai-diff';

jaccardSimilarity('hello world', 'hello earth'); // 0.333...
jaccardSimilarity('hello world', 'hello world'); // 1.0
jaccardSimilarity('', '');                        // 1.0
```

#### `cosineSimilarity(textA, textB)`

Compute cosine similarity using word-frequency vectors. Returns a value between 0.0 and 1.0.

```typescript
import { cosineSimilarity } from 'ai-diff';

cosineSimilarity('the quick brown fox', 'the slow brown cat'); // 0.0 - 1.0
```

#### `exactMatchRatio(textA, textB)`

Returns `1.0` if the two texts are identical, `0.0` otherwise.

```typescript
import { exactMatchRatio } from 'ai-diff';

exactMatchRatio('hello', 'hello'); // 1.0
exactMatchRatio('hello', 'world'); // 0.0
```

#### `compositeSimilarity(textA, textB)`

Weighted composite: Jaccard (0.5) + Cosine (0.3) + Exact Match (0.2).

```typescript
import { compositeSimilarity } from 'ai-diff';

compositeSimilarity('hello world', 'hello earth'); // 0.0 - 1.0
```

#### `embeddingCosineSimilarity(a, b)`

Compute cosine similarity between two numeric embedding vectors. Throws if vectors have different lengths.

```typescript
import { embeddingCosineSimilarity } from 'ai-diff';

embeddingCosineSimilarity([1, 0, 0], [0, 1, 0]); // 0.0
embeddingCosineSimilarity([1, 0], [1, 0]);         // 1.0
```

#### `computeLengthStats(text)`

Returns `{ words, sentences, characters }` for a given text.

```typescript
import { computeLengthStats } from 'ai-diff';

computeLengthStats('Hello world. Goodbye.'); // { words: 3, sentences: 2, characters: 21 }
```

---

### Diff Utilities

#### `diffWords(textA, textB)`

Compute a word-level diff between two strings. Returns `DiffSegment[]`.

```typescript
import { diffWords } from 'ai-diff';

const segments = diffWords('hello world', 'hello earth');
// [
//   { text: 'hello', type: 'unchanged' },
//   { text: ' ', type: 'unchanged' },
//   { text: 'world', type: 'removed' },
//   { text: 'earth', type: 'added' },
// ]
```

#### `diffLines(textA, textB)`

Compute a line-level diff between two strings. Returns `DiffSegment[]`.

```typescript
import { diffLines } from 'ai-diff';

const segments = diffLines('line1\nline2', 'line1\nline3');
```

#### `diffJson(a, b)`

Compute a structural diff between two parsed JSON values. Returns `JsonChange[]` with dot-notation paths.

```typescript
import { diffJson } from 'ai-diff';

const changes = diffJson(
  { name: 'Alice', age: 30 },
  { name: 'Alice', age: 31, role: 'admin' },
);
// [
//   { path: 'age', type: 'changed', before: 30, after: 31 },
//   { path: 'role', type: 'added', after: 'admin' },
// ]
```

#### `computeHunks(textA, textB, contextLines?)`

Compute diff hunks (contiguous groups of changes with context lines) between two texts. Returns `DiffHunk[]`.

```typescript
import { computeHunks } from 'ai-diff';

const hunks = computeHunks('line1\nline2\nline3', 'line1\nchanged\nline3', 3);
```

#### `tryParseJson(text)`

Attempt to parse a string as JSON. Returns the parsed value on success or `null` on failure.

---

### Metrics Utilities

#### `estimateCost(output, pricingOverrides?)`

Estimate the cost of an LLM output in USD. Returns the output's `cost` field if set, otherwise computes from model pricing and token counts. Returns `undefined` if insufficient data.

```typescript
import { estimateCost } from 'ai-diff';

estimateCost({ text: 'hello', model: 'gpt-4o', tokens: { input: 100, output: 50 } });
// 0.00075 (computed from built-in GPT-4o pricing)

estimateCost(
  { text: 'hello', model: 'custom', tokens: { input: 1000, output: 500 } },
  { custom: { input: 0.001, output: 0.002 } },
);
// 2.0
```

#### `getModelPricing()`

Returns a copy of the built-in model pricing table. Each entry maps a model name to `{ input: number; output: number }` (per-token USD).

```typescript
import { getModelPricing } from 'ai-diff';

const pricing = getModelPricing();
// {
//   'gpt-4o':        { input: 0.0000025, output: 0.00001 },
//   'claude-sonnet':  { input: 0.000003,  output: 0.000015 },
//   ...
// }
```

**Built-in models:** `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`, `gpt-4-turbo`, `claude-opus`, `claude-sonnet`, `claude-haiku`, `gemini-pro`, `gemini-flash`.

#### `computeMetrics(outputA, outputB, options?)`

Compute full comparative metrics between two outputs. Supports an optional `embedFn` for semantic similarity.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `outputA` | `LLMOutput` | First output. |
| `outputB` | `LLMOutput` | Second output. |
| `options.embedFn` | `(text: string) => Promise<number[]>` | Optional embedding function for semantic similarity. |
| `options.pricing` | `Record<string, { input: number; output: number }>` | Optional pricing overrides. |

**Returns:** `Promise<DiffMetrics>`

---

### Formatter Utilities

#### `renderUnifiedDiff(result, useColor?)`

Render a `DiffResult` as a unified diff string with optional ANSI colors. Removed lines are prefixed with `-` (red), added lines with `+` (green). Word-level changes are highlighted with bold inverse.

#### `renderSideBySide(result, useColor?, width?)`

Render a `DiffResult` as a two-column side-by-side display. Column width defaults to `(width - 3) / 2`.

#### `renderInlineDiff(segments, useColor?)`

Render `DiffSegment[]` as inline text. Removed words appear with strikethrough (or `~~text~~` without color), added words with underline (or `__text__`).

#### `renderJsonDiff(changes, originalA, originalB, useColor?)`

Render `JsonChange[]` as a formatted string showing added, removed, and changed keys.

#### `renderMetricsTable(metrics, labelA, labelB, useColor?)`

Render a `DiffMetrics` object as a Unicode box-drawing table comparing all metrics between two outputs.

#### `shouldUseColor(override?)`

Returns `true` if ANSI colors should be used. Checks `override`, then `NO_COLOR` env var, then `process.stdout.isTTY`.

---

### Normalization Utilities

#### `normalizeOutput(input)`

Convert a `string | LLMOutput` to an `LLMOutput` object. Plain strings become `{ text: string }`.

#### `enrichOutput(output)`

Fill in estimated fields on an `LLMOutput`. Adds estimated `tokens.output` (via `ceil(text.length / 4)`) when not provided.

#### `estimateTokens(text)`

Estimate token count from text length: `Math.ceil(text.length / 4)`.

#### `tokenizeWords(text)`

Split text into word and whitespace tokens (preserving whitespace). Used internally by the LCS diff algorithm.

## Configuration

### `DiffOptions`

```typescript
interface DiffOptions {
  /** Diff mode. Default: 'unified'. */
  mode?: 'unified' | 'side-by-side' | 'inline' | 'metrics' | 'json';

  /** Context lines around changes in unified mode. Default: 3. */
  contextLines?: number;

  /** Embedding function for semantic similarity. */
  embedFn?: (text: string) => Promise<number[]>;

  /** Per-token pricing overrides in USD. Keyed by model name. */
  pricing?: Record<string, { input: number; output: number }>;

  /** Show the metrics summary table. Default: true. */
  showMetrics?: boolean;

  /** Position of the metrics table. Default: 'top'. */
  metricsPosition?: 'top' | 'bottom';

  /** Which metrics to display. Default: all available. */
  metrics?: ('tokens' | 'cost' | 'latency' | 'similarity' | 'length' | 'model')[];

  /** Terminal width override for side-by-side mode. Default: auto-detected. */
  width?: number;

  /** ANSI color override. Default: auto-detected (true if TTY). */
  color?: boolean;

  /** Custom labels for outputs. Default: model names or 'Output A'/'Output B'. */
  labels?: string[];
}
```

### `CompareOptions`

Extends `DiffOptions` with:

```typescript
interface CompareOptions extends DiffOptions {
  /** Max concurrent model calls. Default: unlimited (all in parallel). */
  concurrency?: number;

  /** Per-call timeout in milliseconds. Default: 30000. */
  timeout?: number;

  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}
```

### Diff Modes

| Mode | Description |
|------|-------------|
| `unified` | Git-style unified diff with word-level highlighting (default). |
| `side-by-side` | Two-column display with aligned content and a vertical separator. |
| `inline` | Inline additions (underline) and deletions (strikethrough) within the original text. |
| `metrics` | Metrics comparison table only; no text diff output. |
| `json` | Structural diff for JSON outputs with key-level change detection. Falls back to text diff if either output is not valid JSON. |

### Output Formats

| Format | Description |
|--------|-------------|
| `terminal` | ANSI-colored output for terminal display. |
| `json` | Full result serialized as `JSON.stringify(result, null, 2)`. |
| `markdown` | Markdown-formatted diff. |
| `plain` | Plain text with no ANSI codes. |

## Error Handling

### Invalid embedding vectors

`embeddingCosineSimilarity` throws if the two vectors have different lengths:

```typescript
import { embeddingCosineSimilarity } from 'ai-diff';

embeddingCosineSimilarity([1, 2], [1, 2, 3]);
// Error: Embedding vectors must have the same length: 2 vs 3
```

### Unknown models

When a model is not in the built-in pricing table and no `pricing` override is provided, `estimateCost` returns `undefined` and the cost row is omitted from the metrics table. No error is thrown.

### Failed model calls in `compare()`

When a model call fails or times out in `compare()`, the failure is captured in the `calls` array with `status: 'error'` and an `error` message. The failed output is excluded from pairwise diffs. Remaining models continue normally.

```typescript
const result = await compare('prompt', ['model-a', 'model-b'], llmFn);

for (const call of result.calls) {
  if (call.status === 'error') {
    console.error(`${call.model} failed: ${call.error}`);
  }
}
```

### JSON diff fallback

When `mode: 'json'` is used but one or both outputs are not valid JSON, the engine falls back to a standard text diff. The `jsonChanges` field on the result will be `undefined`.

## Advanced Usage

### Semantic similarity with custom embeddings

Provide an `embedFn` to compute semantic similarity alongside Jaccard:

```typescript
import { computeMetrics } from 'ai-diff';

const metrics = await computeMetrics(
  { text: 'The cat sat on the mat.', model: 'gpt-4o', tokens: { output: 8 } },
  { text: 'A feline rested on a rug.', model: 'claude-sonnet', tokens: { output: 7 } },
  {
    embedFn: async (text) => {
      // Call your embedding API (OpenAI, Cohere, etc.)
      return await getEmbedding(text);
    },
  },
);

console.log(metrics.similarity.semantic); // 0.0 - 1.0
```

### Custom model pricing

Override or extend the built-in pricing table:

```typescript
import { diff } from 'ai-diff';

const result = diff(outputA, outputB, {
  pricing: {
    'my-custom-model': { input: 0.001, output: 0.002 },
    'gpt-4o': { input: 0.000003, output: 0.000012 }, // override built-in
  },
});
```

### Comparing structured JSON outputs

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(
  { text: '{"name":"Alice","age":30}', model: 'gpt-4o' },
  { text: '{"name":"Alice","age":31,"role":"admin"}', model: 'claude-sonnet' },
  { mode: 'json' },
);

console.log(result.jsonChanges);
// [
//   { path: 'age', type: 'changed', before: 30, after: 31 },
//   { path: 'role', type: 'added', after: 'admin' },
// ]

console.log(formatDiff(result, 'terminal'));
```

### Concurrency-limited model comparison

```typescript
import { compare } from 'ai-diff';

const result = await compare(
  'Summarize this article.',
  ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet', 'gemini-pro'],
  async (prompt, model) => callLLM(prompt, model),
  { concurrency: 2, timeout: 10000 },
);

// Only 2 models called at a time; each call times out after 10s
```

### Metrics-only comparison

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(outputA, outputB, { mode: 'metrics' });
console.log(formatDiff(result, 'terminal'));
// Prints only the metrics comparison table, no text diff
```

## TypeScript

All types are exported from the package root:

```typescript
import type {
  LLMOutput,
  LLMFn,
  DiffMode,
  DiffOptions,
  CompareOptions,
  OutputFormat,
  DiffResult,
  MultiDiffResult,
  ComparisonResult,
  DiffSegment,
  DiffHunk,
  DiffMetrics,
  LengthStats,
  JsonChange,
} from 'ai-diff';
```

The package is compiled with TypeScript strict mode targeting ES2022 (CommonJS output). Declaration files and source maps are included.

## License

MIT
