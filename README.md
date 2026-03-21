# ai-diff

Compare LLM outputs with word-level and line-level diffs, ANSI colored terminal output, and AI-specific metrics (tokens, cost, latency, similarity).

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

console.log(formatDiff(result, 'terminal'));
```

## API

### `diff(outputA, outputB, options?): DiffResult`

Compare two LLM outputs. Accepts plain strings or `LLMOutput` objects with metadata.

```typescript
// Plain strings
const result = diff('Output from model A', 'Output from model B');

// With metadata
const result = diff(
  { text: 'Response A', model: 'gpt-4o', tokens: { input: 100, output: 50 }, cost: 0.005, latency: 1200 },
  { text: 'Response B', model: 'claude-sonnet', tokens: { input: 100, output: 75 } },
  { mode: 'unified' },
);
```

### `diffOutputs(outputs, options?): MultiDiffResult`

Compare N outputs pairwise.

```typescript
import { diffOutputs } from 'ai-diff';

const result = diffOutputs([
  { text: 'Output A', model: 'gpt-4o' },
  { text: 'Output B', model: 'claude-sonnet' },
  { text: 'Output C', model: 'gemini-pro' },
]);

console.log(result.pairwise.length); // 3 (A-B, A-C, B-C)
```

### `compare(prompt, models, llmFn, options?): Promise<ComparisonResult>`

Send a prompt to multiple models and compare the outputs.

```typescript
import { compare } from 'ai-diff';

const result = await compare(
  'Explain quantum computing in 3 sentences.',
  ['gpt-4o', 'claude-sonnet'],
  async (prompt, model) => {
    const response = await callMyLLM(prompt, model);
    return { text: response.text, tokens: response.usage, model };
  },
);
```

### `formatDiff(result, format): string`

Format a diff result for display. Supported formats: `'terminal'`, `'json'`, `'markdown'`, `'plain'`.

## Diff Modes

- **`unified`** (default) -- Git-style unified diff with word-level highlighting
- **`side-by-side`** -- Two-column display with aligned content
- **`inline`** -- Inline additions/deletions with strikethrough and underline
- **`metrics`** -- Metrics comparison table only, no text diff
- **`json`** -- Structural diff for JSON outputs with key-level change detection

```typescript
const result = diff(outputA, outputB, { mode: 'json' });
console.log(result.jsonChanges);
```

## Metrics

Every diff includes AI-specific metrics:

| Metric | Description |
|---|---|
| Output tokens | Token count of each output |
| Input tokens | Prompt token count (if provided) |
| Cost | Estimated cost in USD |
| Latency | Response time in milliseconds |
| Jaccard similarity | Word-level set overlap (0-1) |
| Words / Sentences / Characters | Length statistics |

Built-in pricing is included for common models (GPT-4o, Claude Sonnet, Gemini Pro, etc.). Provide custom pricing via the `pricing` option.

## Options

```typescript
interface DiffOptions {
  mode?: 'unified' | 'side-by-side' | 'inline' | 'metrics' | 'json';
  contextLines?: number;       // Context lines in unified mode (default: 3)
  embedFn?: (text: string) => Promise<number[]>;  // For semantic similarity
  pricing?: Record<string, { input: number; output: number }>;  // Per-token USD
  showMetrics?: boolean;       // Show metrics table (default: true)
  metricsPosition?: 'top' | 'bottom';
  width?: number;              // Terminal width override
  color?: boolean;             // ANSI color override
  labels?: string[];           // Custom output labels
}
```

## Similarity Functions

```typescript
import { jaccardSimilarity, cosineSimilarity, compositeSimilarity } from 'ai-diff';

jaccardSimilarity('hello world', 'hello earth');  // 0.333...
cosineSimilarity('hello world', 'hello earth');    // word-frequency cosine
compositeSimilarity('hello world', 'hello earth'); // weighted composite
```

## Zero Runtime Dependencies

This package has zero runtime dependencies. All diffing algorithms (LCS-based word and line diff), similarity scoring, and formatting are implemented from scratch using only Node.js built-ins.

## Requirements

- Node.js >= 18
- ES2022, CommonJS output
- TypeScript strict mode

## License

MIT
