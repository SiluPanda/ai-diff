# ai-diff — Task Breakdown

Comprehensive task list derived from [SPEC.md](./SPEC.md). Every feature, configuration option, error handling case, and edge case from the spec is mapped to at least one task.

---

## Phase 1: Project Scaffolding and Setup

- [ ] **Install runtime dependencies** — Add `diff` (jsdiff) `^7.0.0` as a runtime dependency in `package.json`. | Status: not_done
- [x] **Install dev dependencies** — Add `typescript`, `vitest`, and `eslint` as dev dependencies in `package.json`. Ensure versions are compatible with Node.js >=18. | Status: done
- [x] **Configure ESLint** — Create `.eslintrc` (or equivalent) with TypeScript support. Configure rules consistent with monorepo conventions. | Status: done
- [x] **Configure Vitest** — Create `vitest.config.ts` if needed, or ensure the existing `vitest run` script works. Confirm test file discovery pattern matches `src/__tests__/**/*.test.ts`. | Status: done
- [ ] **Create directory structure** — Create all directories specified in the file structure: `src/engine/`, `src/metrics/`, `src/formatters/`, `src/input/`, `src/utils/`, `src/__tests__/`, `src/__tests__/engine/`, `src/__tests__/metrics/`, `src/__tests__/formatters/`, `src/__tests__/input/`, `src/__tests__/fixtures/`, and `bin/`. | Status: not_done
- [ ] **Create CLI binary entry point** — Create `bin/ai-diff.js` with a `#!/usr/bin/env node` shebang that requires `../dist/cli.js`. Add `"bin": { "ai-diff": "./bin/ai-diff.js" }` to `package.json`. | Status: not_done
- [ ] **Configure package.json exports** — Ensure `"main"`, `"types"`, and `"files"` fields are correct. Add `"bin"` field. Verify `"engines"` is set to `"node": ">=18"`. | Status: not_done
- [ ] **Add optional peer dependency** — Add `model-price-registry` as an optional peer dependency in `package.json`. | Status: not_done
- [ ] **Create test fixtures** — Create sample fixture files in `src/__tests__/fixtures/`: `output-gpt4.txt`, `output-claude.txt`, `output-gemini.txt`, `structured-a.json`, `structured-b.json`, `comparison-input.json`, `cassette-v1.json`, `cassette-v2.json`. Populate with realistic sample data. | Status: not_done

---

## Phase 2: Type Definitions

- [x] **Define LLMOutput interface** — In `src/types.ts`, define the `LLMOutput` interface with fields: `text` (required string), `model` (optional string), `tokens` (optional `{ input?: number; output?: number }`), `cost` (optional number), `latency` (optional number), `metadata` (optional `Record<string, unknown>`). | Status: done
- [x] **Define LLMFn type** — In `src/types.ts`, define `LLMFn` as `(prompt: string, model: string) => Promise<LLMOutput | string>`. | Status: done
- [x] **Define DiffMode type** — In `src/types.ts`, define `DiffMode` as the union `'unified' | 'side-by-side' | 'inline' | 'metrics' | 'json'`. | Status: done
- [x] **Define OutputFormat type** — In `src/types.ts`, define `OutputFormat` as `'terminal' | 'json' | 'markdown' | 'plain'`. | Status: done
- [x] **Define DiffOptions interface** — In `src/types.ts`, define `DiffOptions` with all fields: `mode`, `contextLines`, `embedFn`, `pricing`, `showMetrics`, `metricsPosition`, `metrics`, `width`, `color`, `labels`. Include JSDoc for each field with default values. | Status: done
- [x] **Define CompareOptions interface** — In `src/types.ts`, define `CompareOptions` extending `DiffOptions` with: `concurrency`, `timeout`, `signal` (AbortSignal). | Status: done
- [x] **Define DiffSegment interface** — In `src/types.ts`, define `DiffSegment` with `text` (string) and `type` (`'added' | 'removed' | 'unchanged'`). | Status: done
- [x] **Define DiffHunk interface** — In `src/types.ts`, define `DiffHunk` with `lineA` (number), `lineB` (number), `segments` (DiffSegment[]). | Status: done
- [x] **Define LengthStats interface** — In `src/types.ts`, define `LengthStats` with `words`, `sentences`, `characters` (all numbers). | Status: done
- [x] **Define DiffMetrics interface** — In `src/types.ts`, define `DiffMetrics` with nested `tokens`, `cost`, `latency`, `similarity`, `length`, and `model` objects per the spec. | Status: done
- [x] **Define JsonChange interface** — In `src/types.ts`, define `JsonChange` with `path` (string), `type` (`'added' | 'removed' | 'changed'`), `before` (optional unknown), `after` (optional unknown). | Status: done
- [x] **Define DiffResult interface** — In `src/types.ts`, define `DiffResult` with: `identical`, `hunks`, `jsonChanges`, `metrics`, `similarity`, `outputA`, `outputB`, `mode`, `durationMs`, `timestamp`. | Status: done
- [x] **Define MultiDiffResult interface** — In `src/types.ts`, define `MultiDiffResult` with: `outputs`, `pairwise` (array of `{ indexA, indexB, result }`), `metricsTable`, `durationMs`, `timestamp`. | Status: done
- [x] **Define ComparisonResult interface** — In `src/types.ts`, define `ComparisonResult` extending `MultiDiffResult` with: `prompt`, `models`, `calls` (array of `{ model, status, output?, error?, latencyMs }`). | Status: done

---

## Phase 3: Utility Modules

- [x] **Implement ANSI color helpers** — In `src/utils/ansi.ts`, implement color functions: `red()`, `green()`, `yellow()`, `cyan()`, `dim()`, `bold()`, `inverse()`, `strikethrough()`, `underline()`, `reset()`. Each wraps text in the appropriate ANSI escape codes. | Status: done
- [x] **Implement color detection** — In `src/utils/ansi.ts`, implement `shouldUseColor()` function that returns `true` if stdout is a TTY and `NO_COLOR` env var is not set. Support override via explicit `color` option. | Status: done
- [x] **Implement text tokenization** — In `src/utils/text.ts`, implement `tokenizeWords(text: string): string[]` that splits on whitespace, lowercases, and removes punctuation. Used by Jaccard similarity. | Status: done
- [x] **Implement sentence splitting** — In `src/utils/text.ts`, implement `countSentences(text: string): number` that counts sentences by detecting terminal punctuation (`.`, `!`, `?`) followed by whitespace or end of string. | Status: done
- [x] **Implement word counting** — In `src/utils/text.ts`, implement `countWords(text: string): number` that counts whitespace-separated tokens. | Status: done
- [x] **Implement character counting** — In `src/utils/text.ts`, implement `countCharacters(text: string): number` that returns total characters including whitespace. | Status: done
- [x] **Implement table rendering** — In `src/utils/table.ts`, implement `renderTable(headers: string[], rows: string[][], options: { unicode: boolean; width?: number }): string`. Render a formatted table using Unicode box-drawing characters (or ASCII fallback for non-TTY). Handle column alignment, minimum widths, and maximum table width. | Status: done
- [ ] **Implement terminal width detection** — In `src/utils/ansi.ts` or a separate utility, implement `getTerminalWidth(): number` using `process.stdout.columns` with fallback to 80. | Status: not_done

---

## Phase 4: Metrics Computation

- [x] **Implement token counting** — In `src/metrics/tokens.ts`, implement `estimateTokens(text: string): number` using `Math.ceil(text.length / 4)` heuristic. Implement `getTokenCounts(output: LLMOutput): { input?: number; output: number }` that uses provided values or falls back to estimation for output tokens. | Status: done
- [x] **Implement built-in pricing table** — In `src/metrics/pricing.ts`, create a static pricing table for common models: GPT-4o, GPT-4o-mini, GPT-3.5-turbo, Claude Opus, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash. Each entry has `input` and `output` per-token prices in USD. | Status: done
- [ ] **Implement model-price-registry integration** — In `src/metrics/pricing.ts`, implement `getModelPricing(model: string, overrides?: Record<string, { input: number; output: number }>): { input: number; output: number } | undefined`. Try `model-price-registry` first (via dynamic `require`/`import` with try/catch), fall back to built-in table, then to overrides. | Status: not_done
- [x] **Implement cost estimation** — In `src/metrics/cost.ts`, implement `estimateCost(output: LLMOutput, pricing?: Record<string, { input: number; output: number }>): number | undefined`. Return provided cost, or compute from model + tokens + pricing, or return undefined. | Status: done
- [x] **Implement length statistics** — In `src/metrics/length.ts`, implement `computeLengthStats(text: string): LengthStats` returning `{ words, sentences, characters }`. | Status: done
- [x] **Implement metrics orchestrator** — In `src/metrics/index.ts`, implement `computeDiffMetrics(outputA: LLMOutput, outputB: LLMOutput, similarity: { jaccard: number; semantic?: number }, options?: DiffOptions): DiffMetrics`. Orchestrate token counting, cost estimation, latency comparison, similarity packaging, length stats, and model info into a single `DiffMetrics` object. | Status: done

---

## Phase 5: Diff Engine

- [x] **Implement text diff (line-level)** — In `src/engine/text-diff.ts`, implement `computeLineDiff(textA: string, textB: string): DiffHunk[]` using `jsdiff`'s `diffLines`. Convert jsdiff output to `DiffHunk[]` with correct `lineA`, `lineB`, and `DiffSegment` arrays. | Status: done
- [x] **Implement text diff (word-level within lines)** — In `src/engine/text-diff.ts`, implement word-level highlighting within changed line pairs. For each pair of removed+added lines, compute `jsdiff`'s `diffWords` and annotate segments with word-level change markers. | Status: done
- [x] **Implement context line handling** — In `src/engine/text-diff.ts`, implement context line filtering for unified mode. Given a full set of hunks and a `contextLines` value (default 3), trim unchanged lines beyond the context window and produce proper hunk boundaries. | Status: done
- [x] **Implement JSON structural diff** — In `src/engine/json-diff.ts`, implement `computeJsonDiff(jsonA: unknown, jsonB: unknown): JsonChange[]`. Recursively walk both objects: detect added, removed, and changed keys. Handle nested objects, arrays (by index), and mixed types. Return `JsonChange[]` with dot-notation `path` strings. | Status: done
- [x] **Implement JSON parse-and-fallback** — In `src/engine/json-diff.ts`, implement logic to parse both outputs as JSON. If either fails to parse, return a fallback indicator so the caller can fall back to unified text diff with a warning. | Status: done
- [x] **Implement Jaccard similarity** — In `src/engine/similarity.ts`, implement `computeJaccardSimilarity(textA: string, textB: string): number`. Tokenize both texts into word sets (lowercase, punctuation removed), compute `|intersection| / |union|`. Handle edge cases: both empty (return 1.0), one empty (return 0.0). | Status: done
- [x] **Implement semantic similarity** — In `src/engine/similarity.ts`, implement `computeSemanticSimilarity(textA: string, textB: string, embedFn: (text: string) => Promise<number[]>): Promise<number>`. Compute embedding vectors for both texts, return cosine similarity: `dot(a, b) / (norm(a) * norm(b))`. | Status: done
- [x] **Implement cosine similarity utility** — In `src/engine/similarity.ts`, implement `cosineSimilarity(a: number[], b: number[]): number` for computing the cosine similarity between two vectors. Handle zero-norm edge case. | Status: done

---

## Phase 6: Core API Functions

- [x] **Implement `diff()` function** — In `src/diff.ts`, implement the main `diff(outputA, outputB, options?)` function. Normalize string inputs to `LLMOutput`. Compute text diff (or JSON diff if mode is `'json'`). Compute Jaccard similarity (and semantic if `embedFn` provided). Compute metrics. Build and return `DiffResult` with `identical`, `hunks`, `jsonChanges`, `metrics`, `similarity`, `outputA`, `outputB`, `mode`, `durationMs`, `timestamp`. | Status: done
- [x] **Implement string-to-LLMOutput normalization** — In `src/diff.ts` or a utility, implement logic to accept `string | LLMOutput` and normalize to `LLMOutput`. A plain string becomes `{ text: string }`. Fill in estimated fields (output tokens via heuristic). | Status: done
- [x] **Implement `diffOutputs()` function** — In `src/multi-diff.ts`, implement `diffOutputs(outputs, options?)`. For N outputs, compute N*(N-1)/2 pairwise diffs. Build a `metricsTable` object with one column per output. Return `MultiDiffResult`. | Status: done
- [x] **Implement metrics table construction** — In `src/multi-diff.ts`, build the `metricsTable` field of `MultiDiffResult` with `labels`, `outputTokens`, `inputTokens`, `costs`, `latencies`, `wordCounts`, `sentenceCounts`, `characterCounts` arrays. | Status: done
- [x] **Implement `compare()` function** — In `src/compare.ts`, implement `compare(prompt, models, llmFn, options?)`. Call `llmFn` for each model in parallel using `Promise.allSettled`. Wrap each call with `performance.now()` timing. Handle failures (record error, continue with remaining). Build `LLMOutput` from results. Call `diffOutputs()` on successful outputs. Return `ComparisonResult`. | Status: done
- [x] **Implement concurrency control for compare()** — In `src/compare.ts`, implement a semaphore-based concurrency limiter when `options.concurrency` is set. Dispatch model calls in batches of the specified size. | Status: done
- [x] **Implement timeout handling for compare()** — In `src/compare.ts`, implement per-model-call timeout using `AbortController` or `Promise.race` with `setTimeout`. Default timeout: 30,000ms. | Status: done
- [ ] **Implement AbortSignal support for compare()** — In `src/compare.ts`, respect `options.signal` for cancellation. If the signal is aborted, cancel pending model calls. | Status: not_done
- [x] **Implement `formatDiff()` function** — In `src/formatters/index.ts`, implement `formatDiff(result, format)` that dispatches to the appropriate formatter (terminal, json, markdown, plain) based on the `format` argument. Accept `DiffResult`, `MultiDiffResult`, or `ComparisonResult`. | Status: done

---

## Phase 7: Formatters

### Terminal Formatter

- [x] **Implement unified diff formatter** — In `src/formatters/terminal.ts`, render a unified diff with ANSI colors. Removed lines/words in red, added lines/words in green, unchanged context in default color. Prefix removed lines with `-`, added lines with `+`. Show configurable context lines around changes. | Status: done
- [x] **Implement word-level highlighting in unified mode** — In `src/formatters/terminal.ts`, within changed lines, highlight specifically changed words using bold + inverse ANSI codes on top of the line-level color (red or green). | Status: done
- [x] **Implement side-by-side formatter** — In `src/formatters/terminal.ts`, render two-column output. Detect terminal width, compute column width as `(width - 3) / 2`. Align paragraphs/lines between columns. Highlight changed words in each column. Wrap long lines. Show vertical separator between columns. | Status: done
- [ ] **Implement side-by-side fallback** — In `src/formatters/terminal.ts`, if terminal width is below 80 columns, fall back to unified mode and emit a warning message. | Status: not_done
- [x] **Implement inline diff formatter** — In `src/formatters/terminal.ts`, render a single merged text with removed words in red with strikethrough and added words in green with underline. | Status: done
- [x] **Implement metrics-only formatter** — In `src/formatters/terminal.ts`, render only the metrics comparison table when mode is `'metrics'`. No text diff output. | Status: done
- [x] **Implement JSON diff terminal renderer** — In `src/formatters/terminal.ts`, render JSON structural changes with ANSI colors. Removed keys/values in red, added in green, changed values showing before (red) and after (green). | Status: done
- [ ] **Implement header rendering** — In `src/formatters/terminal.ts`, render the header: version string, "Comparing: X vs Y", "Mode: Z". Use cyan color for labels. | Status: not_done
- [ ] **Implement footer rendering** — In `src/formatters/terminal.ts`, render the footer: "Analyzed in Xms". | Status: not_done

### Metrics Table Formatter

- [x] **Implement metrics summary table** — In `src/formatters/metrics-table.ts`, render the metrics comparison table using Unicode box-drawing characters. Columns for each output (labeled by model name or "Output A"/"Output B"). Rows for: output tokens, input tokens, cost, latency, similarity, words, sentences, characters. Show delta and percentage change. | Status: done
- [ ] **Implement metrics table positioning** — Support `metricsPosition` option (`'top'` or `'bottom'`). When `showMetrics` is false, omit the table entirely. | Status: not_done
- [ ] **Implement selective metrics display** — Support `metrics` option array to control which metric rows are shown (e.g., only `['cost', 'latency']`). | Status: not_done
- [x] **Implement delta formatting** — Format deltas with sign (e.g., `+356 (+42%)`, `-260ms`, `+$0.0018`). Color positive cost/token deltas red (more expensive), negative green (cheaper). Color positive latency deltas red (slower), negative green (faster). | Status: done
- [ ] **Implement multi-output metrics table** — For `MultiDiffResult` and `ComparisonResult`, render a table with one column per output (not just two). Handle N columns dynamically. | Status: not_done

### JSON Formatter

- [x] **Implement JSON output formatter** — In `src/formatters/json.ts`, serialize the `DiffResult`, `MultiDiffResult`, or `ComparisonResult` to a JSON string. Include all fields. Use `JSON.stringify` with 2-space indentation. | Status: done

### Markdown Formatter

- [ ] **Implement markdown output formatter** — In `src/formatters/markdown.ts`, render the diff as markdown suitable for PR comments. Use fenced code blocks for diff output, markdown tables for metrics, and headings for structure. | Status: not_done

### Plain Text Formatter

- [x] **Implement plain text output formatter** — In `src/formatters/plain.ts`, render the same content as the terminal formatter but with all ANSI escape codes stripped. Use ASCII characters for table borders instead of Unicode box-drawing characters. | Status: done

---

## Phase 8: Input Handling

- [ ] **Implement file input reader** — In `src/input/file.ts`, implement `readFileInput(filePath: string): LLMOutput`. Read file as UTF-8 text. If `.json` extension, attempt to parse as `LLMOutput` JSON object. If parse succeeds, use metadata. If parse fails, treat raw content as output text. Handle file-not-found and read errors. | Status: not_done
- [ ] **Implement stdin input reader** — In `src/input/stdin.ts`, implement `readStdinInput(delimiter: string): Promise<[string, string]>`. Read all stdin, split by delimiter (default `'---'`). Delimiter must be on its own line with no leading/trailing whitespace. Validate exactly two parts are found. Return both output strings. | Status: not_done
- [ ] **Implement JSON input reader** — In `src/input/json-input.ts`, implement `readJsonInput(filePath: string): { a: LLMOutput; b: LLMOutput }`. Read and parse a JSON file with `a` and `b` fields, each containing `LLMOutput` data. Validate required fields. Handle parse errors. | Status: not_done
- [ ] **Implement llm-vcr cassette reader** — In `src/input/cassette.ts`, implement `readCassette(filePath: string): LLMOutput`. Read an `llm-vcr` cassette JSON file, extract the response text and metadata (model, tokens, etc.). Handle missing fields gracefully. | Status: not_done

---

## Phase 9: CLI Implementation

- [ ] **Implement CLI argument parsing** — In `src/cli.ts`, use `node:util.parseArgs` to parse all CLI flags defined in the spec: positional file args, `--stdin`, `--delimiter`, `--json`, `--cassette`, `--prompt`, `--models`, `--llm-command`, `--concurrency`, `--timeout`, `--mode`, `--context`, `--word-diff`, `--line-diff`, `--no-metrics`, `--metrics-position`, `--metrics`, `--format`, `--width`, `--color`, `--no-color`, `--label-a`, `--label-b`, `--version`, `--help`. | Status: not_done
- [ ] **Implement environment variable fallbacks** — In `src/cli.ts`, read `AI_DIFF_MODE`, `AI_DIFF_WIDTH`, `NO_COLOR`, `AI_DIFF_METRICS` environment variables. CLI flags take precedence over env vars. | Status: not_done
- [ ] **Implement --help output** — In `src/cli.ts`, render a formatted help message listing all commands, flags, and usage examples. Exit with code 0. | Status: not_done
- [ ] **Implement --version output** — In `src/cli.ts`, read version from `package.json` and print it. Exit with code 0. | Status: not_done
- [ ] **Implement file comparison mode** — In `src/cli.ts`, when two positional file arguments are provided, read both files using `readFileInput()`, run `diff()`, format output using `formatDiff()`, print to stdout. | Status: not_done
- [ ] **Implement stdin comparison mode** — In `src/cli.ts`, when `--stdin` is set, read from stdin using `readStdinInput()`, run `diff()`, format and print. | Status: not_done
- [ ] **Implement JSON input mode** — In `src/cli.ts`, when `--json <file>` is set, read the JSON file using `readJsonInput()`, run `diff()`, format and print. | Status: not_done
- [ ] **Implement cassette comparison mode** — In `src/cli.ts`, when `--cassette` is provided twice, read both cassettes using `readCassette()`, run `diff()`, format and print. | Status: not_done
- [ ] **Implement live comparison mode (CLI)** — In `src/cli.ts`, when `--prompt` and `--models` are set, construct an `llmFn` from `--llm-command` (substituting `$PROMPT` and `$MODEL`), call `compare()`, format and print the `ComparisonResult`. | Status: not_done
- [ ] **Implement --llm-command shell execution** — In `src/cli.ts`, implement the shell command template execution. Substitute `$PROMPT` and `$MODEL` in the command string, execute via `child_process.exec`, capture stdout as output text. | Status: not_done
- [ ] **Implement exit codes** — In `src/cli.ts`, exit with code 0 if outputs are identical, code 1 if differences found, code 2 for configuration/usage errors (invalid flags, missing files, file read failure, invalid input). | Status: not_done
- [ ] **Implement CLI error handling** — In `src/cli.ts`, catch all errors (file not found, invalid JSON, missing required flags, invalid flag values) and print a user-friendly error message to stderr. Exit with code 2. | Status: not_done
- [ ] **Implement non-TTY color handling in CLI** — In `src/cli.ts`, auto-detect TTY for color. Respect `--color` to force on, `--no-color` and `NO_COLOR` to force off. Pass the resolved `color` option to formatters. | Status: not_done

---

## Phase 10: Public API Exports

- [x] **Wire up index.ts exports** — In `src/index.ts`, export all public API functions (`diff`, `diffOutputs`, `compare`, `formatDiff`) and all public types (`LLMOutput`, `LLMFn`, `DiffMode`, `OutputFormat`, `DiffOptions`, `CompareOptions`, `DiffSegment`, `DiffHunk`, `LengthStats`, `DiffMetrics`, `JsonChange`, `DiffResult`, `MultiDiffResult`, `ComparisonResult`). | Status: done

---

## Phase 11: Unit Tests

### Diff Engine Tests

- [x] **Test text diff with identical texts** — Verify that diffing identical texts produces zero hunks and `identical: true`. | Status: done
- [x] **Test text diff with completely different texts** — Verify that diffing unrelated texts produces a single hunk covering entire content. | Status: done
- [x] **Test text diff with minor edits** — Verify that a few-word change produces precise hunks with correct context lines. | Status: done
- [x] **Test text diff context lines** — Verify that `contextLines` option correctly controls the number of surrounding unchanged lines. | Status: done
- [x] **Test word-level diff within changed lines** — Verify that word-level segments are correctly identified within changed line pairs. | Status: done

### JSON Diff Tests

- [x] **Test JSON diff with added keys** — Verify detection of keys present in B but not A. | Status: done
- [x] **Test JSON diff with removed keys** — Verify detection of keys present in A but not B. | Status: done
- [x] **Test JSON diff with changed values** — Verify detection of keys with different values, with correct `before` and `after`. | Status: done
- [x] **Test JSON diff with nested objects** — Verify recursive comparison of nested objects with correct dot-notation paths. | Status: done
- [x] **Test JSON diff with arrays** — Verify array comparison by index: added/removed elements at the end, changed elements at matching indices. | Status: done
- [x] **Test JSON diff with mixed types** — Verify handling when a value changes type (e.g., string to number). | Status: done
- [x] **Test JSON diff with invalid JSON fallback** — Verify that non-JSON input triggers fallback behavior (not an error). | Status: done

### Similarity Tests

- [x] **Test Jaccard similarity with identical texts** — Verify returns 1.0. | Status: done
- [x] **Test Jaccard similarity with completely different texts** — Verify returns 0.0. | Status: done
- [x] **Test Jaccard similarity with partially overlapping texts** — Verify returns a known expected value. | Status: done
- [x] **Test Jaccard similarity with empty strings** — Verify correct handling: both empty returns 1.0, one empty returns 0.0. | Status: done
- [x] **Test Jaccard case insensitivity** — Verify that "Hello World" and "hello world" have similarity 1.0. | Status: done
- [x] **Test Jaccard punctuation handling** — Verify that punctuation is stripped before comparison. | Status: done
- [x] **Test semantic similarity computation** — Mock `embedFn`, verify cosine similarity is correctly computed. | Status: done
- [x] **Test cosine similarity edge cases** — Test with zero vectors, identical vectors, orthogonal vectors. | Status: done

### Metrics Tests

- [x] **Test token count estimation** — Verify `Math.ceil(text.length / 4)` heuristic produces expected values for various text lengths. | Status: done
- [x] **Test token count with provided values** — Verify that provided `tokens.output` overrides estimation. | Status: done
- [x] **Test cost estimation with known pricing** — Verify cost computation: `(input * inputPrice) + (output * outputPrice)` for a known model. | Status: done
- [x] **Test cost estimation with provided cost** — Verify that provided `cost` overrides computation. | Status: done
- [x] **Test cost estimation with missing pricing** — Verify cost is `undefined` when model is unknown and no pricing override is provided. | Status: done
- [x] **Test length statistics** — Verify word count, sentence count, and character count for known text inputs. | Status: done
- [x] **Test sentence counting edge cases** — Verify handling of abbreviations, multiple punctuation marks, and text without terminal punctuation. | Status: done
- [x] **Test metrics orchestrator** — Verify `computeDiffMetrics` assembles all sub-metrics correctly, handles optional fields (latency, cost, input tokens). | Status: done

### Formatter Tests

- [x] **Test terminal formatter ANSI codes** — Verify that removed text uses red (`\x1b[31m`), added text uses green (`\x1b[32m`), headers use cyan (`\x1b[36m`). | Status: done
- [x] **Test terminal formatter non-TTY output** — Verify that ANSI codes are omitted when color is disabled. | Status: done
- [x] **Test JSON formatter produces valid JSON** — Verify that `formatDiff(result, 'json')` output is parseable by `JSON.parse`. | Status: done
- [ ] **Test markdown formatter produces valid markdown** — Verify correct use of fenced code blocks, markdown tables, and headings. | Status: not_done
- [x] **Test plain formatter has no ANSI codes** — Verify that no `\x1b[` sequences appear in plain output. | Status: done
- [x] **Test metrics table rendering** — Verify table structure, column alignment, delta formatting. Test with various combinations of available metrics. | Status: done
- [x] **Test metrics table with missing data** — Verify table renders correctly when latency or cost is unavailable for some outputs. | Status: done
- [ ] **Test header and footer rendering** — Verify version string, comparison labels, mode, and "Analyzed in Xms" footer. | Status: not_done

### Input Parsing Tests

- [ ] **Test file input reading** — Verify reading a plain text file returns its content as `LLMOutput.text`. | Status: not_done
- [ ] **Test file input with JSON format** — Verify that a `.json` file is parsed as `LLMOutput` with metadata. | Status: not_done
- [ ] **Test file input with invalid JSON** — Verify that a `.json` file with invalid JSON is treated as raw text. | Status: not_done
- [ ] **Test file input with non-existent file** — Verify appropriate error is thrown. | Status: not_done
- [ ] **Test stdin input splitting** — Verify splitting by default delimiter `---` produces two outputs. | Status: not_done
- [ ] **Test stdin input with custom delimiter** — Verify splitting by a custom delimiter. | Status: not_done
- [ ] **Test stdin input with missing delimiter** — Verify error when delimiter is not found. | Status: not_done
- [ ] **Test JSON input parsing** — Verify reading and parsing a structured JSON input file with `a` and `b` fields. | Status: not_done
- [ ] **Test JSON input with missing fields** — Verify error when required fields are missing. | Status: not_done

### CLI Tests

- [ ] **Test CLI argument parsing** — Verify correct parsing of all flags and positional arguments. | Status: not_done
- [ ] **Test CLI --help flag** — Verify help output is printed and exit code is 0. | Status: not_done
- [ ] **Test CLI --version flag** — Verify version is printed and exit code is 0. | Status: not_done
- [ ] **Test CLI exit code 0 for identical outputs** — Create two identical temp files, run CLI, verify exit code 0. | Status: not_done
- [ ] **Test CLI exit code 1 for different outputs** — Create two different temp files, run CLI, verify exit code 1. | Status: not_done
- [ ] **Test CLI exit code 2 for errors** — Run CLI with invalid flags or missing files, verify exit code 2. | Status: not_done
- [ ] **Test CLI environment variable fallback** — Set `AI_DIFF_MODE` env var, verify it is used when `--mode` flag is not provided. | Status: not_done

---

## Phase 12: Integration Tests

- [x] **Integration test: identical outputs end-to-end** — Diff two identical outputs through the full pipeline. Assert `identical: true`, zero hunks, Jaccard similarity 1.0, correct metrics. | Status: done
- [x] **Integration test: minor edit end-to-end** — Diff two outputs differing by a few words. Assert correct hunks, metrics, and similarity score. | Status: done
- [ ] **Integration test: completely different outputs** — Diff two unrelated outputs. Assert low similarity, comprehensive hunks. | Status: not_done
- [x] **Integration test: JSON outputs in json mode** — Diff two JSON strings in `json` mode. Assert correct `jsonChanges` array. | Status: done
- [x] **Integration test: multi-output comparison** — Compare 3 outputs using `diffOutputs()`. Assert 3 pairwise diffs and a correct metrics table. | Status: done
- [x] **Integration test: live comparison with mock** — Mock `llmFn`, run `compare()`. Verify outputs, diffs, timing, and `calls` array. | Status: done
- [x] **Integration test: live comparison with failure** — Mock `llmFn` to fail for one model. Verify the failure is recorded, remaining outputs are compared, and metrics table shows "ERROR". | Status: done
- [ ] **Integration test: file input via CLI** — Write temp files, run CLI as subprocess, verify exit code and stdout content. | Status: not_done
- [ ] **Integration test: stdin input via CLI** — Pipe test data to CLI subprocess, verify correct splitting and output. | Status: not_done
- [x] **Integration test: non-TTY output** — Pipe CLI output to a file, verify no ANSI codes in output. | Status: done
- [x] **Integration test: all diff modes** — Run `diff()` with each mode (`unified`, `side-by-side`, `inline`, `metrics`, `json`) and verify output format is correct for each. | Status: done
- [ ] **Integration test: all output formats** — Run `formatDiff()` with each format (`terminal`, `json`, `markdown`, `plain`) and verify output correctness. | Status: not_done

---

## Phase 13: Edge Case Tests

- [x] **Edge case: empty output string** — Diff an empty string against a non-empty string. All content should show as added. | Status: done
- [x] **Edge case: two empty outputs** — Diff two empty strings. Should be `identical: true`, similarity 1.0. | Status: done
- [x] **Edge case: one empty, one non-empty** — Verify all content is marked as additions, similarity is 0.0. | Status: done
- [x] **Edge case: whitespace-only output** — Diff text that contains only whitespace. Verify reasonable behavior. | Status: done
- [ ] **Edge case: very long output (100KB+)** — Performance test: diff two large outputs and verify completion within reasonable time (< 1 second). | Status: not_done
- [ ] **Edge case: output containing ANSI escape codes** — Verify that ANSI codes in input text do not interfere with diff formatting. | Status: not_done
- [x] **Edge case: output containing Unicode** — Test with emoji, CJK characters, and RTL text. Verify diff and formatting are correct. | Status: done
- [x] **Edge case: JSON mode with non-JSON input** — Verify graceful fallback to unified text diff with a warning. | Status: done
- [ ] **Edge case: live comparison where all model calls fail** — Verify appropriate error handling and result structure. | Status: not_done
- [ ] **Edge case: terminal width below 80 for side-by-side** — Verify fallback to unified mode with a warning message. | Status: not_done
- [x] **Edge case: missing model pricing data** — Verify cost is omitted (not an error) when model is not in pricing table. | Status: done
- [x] **Edge case: output with same words in different order** — Verify Jaccard similarity is 1.0 (same word sets) but text diff shows changes. | Status: done

---

## Phase 14: Documentation

- [x] **Write README.md** — Create a comprehensive README with: package overview, installation instructions, quick start examples, API reference (all exported functions and types), CLI reference (all flags and usage examples), diff mode descriptions with example outputs, metrics explanation, configuration options, integration with other monorepo packages, and link to SPEC.md. | Status: done
- [x] **Add JSDoc comments to all public exports** — Add JSDoc comments to every exported function, type, and interface in `src/index.ts`, `src/types.ts`, `src/diff.ts`, `src/multi-diff.ts`, `src/compare.ts`, and `src/formatters/index.ts`. | Status: done
- [x] **Add inline code comments** — Add explanatory comments to non-obvious logic: Myers algorithm wrapper, Jaccard computation, cost estimation fallback chain, concurrency limiter, JSON recursive walker. | Status: done

---

## Phase 15: Build and Publish Preparation

- [x] **Verify TypeScript compilation** — Run `npm run build` and ensure zero errors. Verify `dist/` contains `.js`, `.d.ts`, and `.js.map` files for all source files. | Status: done
- [x] **Verify lint passes** — Run `npm run lint` and ensure zero warnings/errors. | Status: done
- [x] **Verify all tests pass** — Run `npm run test` and ensure all unit, integration, and edge case tests pass. | Status: done
- [ ] **Verify CLI binary works** — Run `node bin/ai-diff.js --version` and `node bin/ai-diff.js --help`. Verify output is correct. | Status: not_done
- [ ] **Verify package.json is publish-ready** — Confirm `name`, `version`, `description`, `main`, `types`, `bin`, `files`, `keywords`, `license`, `engines`, `publishConfig` fields are correct. Add relevant keywords (e.g., `ai`, `llm`, `diff`, `compare`, `model`, `tokens`, `cost`). | Status: not_done
- [x] **Bump version** — Bump version in `package.json` per semver. Since this is initial implementation, version should be `0.1.0` (already set). | Status: done
- [ ] **Dry-run publish** — Run `npm publish --dry-run` to verify the package contents and ensure nothing sensitive is included. | Status: not_done
