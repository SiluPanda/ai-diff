# ai-diff -- Specification

## 1. Overview

`ai-diff` is a CLI and programmatic tool for comparing LLM outputs across models, prompts, and parameters. It computes word-level and line-level text diffs between two or more LLM outputs, displays them with terminal-formatted ANSI colors, and annotates the diff with AI-specific metrics: token counts (input and output), estimated cost (from model pricing data), response latency, similarity scores, and length statistics. The result is a structured `DiffResult` object that can be rendered as a unified diff, side-by-side comparison, inline diff, metrics-only table, or JSON diff for structured outputs.

The gap this package fills is specific and well-defined. Prompt engineers constantly compare LLM outputs -- same prompt on different models (GPT-4o vs Claude Sonnet), same model with different prompts (v1 vs v2), same prompt with different parameters (temperature 0 vs 0.7), same prompt at different points in time (before and after a model update). The comparison workflow today involves copying outputs into a text file, running `diff` or `git diff`, and manually noting token counts, costs, and response times in a spreadsheet. No existing tool combines text diffing with AI-specific metrics in a single view.

The existing tool landscape is entirely AI-unaware. `diff` (GNU coreutils) computes line-level diffs between files. `git diff` adds word-level highlighting with `--word-diff` mode. `delta` (dandavison/delta) improves git diff rendering with syntax highlighting and side-by-side mode. `vimdiff` provides interactive side-by-side editing. `jsdiff` (npm, 7M+ weekly downloads) provides programmatic word/line/sentence diff algorithms. `diff-match-patch` (Google) provides character-level diffing. All of these tools treat text as generic strings. None know that the text was produced by an LLM. None can show "Output A used 847 tokens and cost $0.0042, Output B used 1,203 tokens and cost $0.0060, Output B is 42% longer and $0.0018 more expensive." None can call two models with the same prompt and diff the results in one command.

Within this monorepo, `prompt-diff` diffs the prompt templates themselves -- comparing the structure and semantics of the prompts that are sent to the LLM. `ai-diff` diffs the outputs that come back from the LLM. `llm-regression` performs batch regression testing across test sets, comparing outputs with pluggable similarity metrics and pass/fail classification. `ai-diff` is the lightweight, single-comparison counterpart: compare two (or more) outputs, see what changed, see the cost/performance tradeoffs, and move on. Where `llm-regression` answers "did this prompt change cause regressions across 50 test cases?", `ai-diff` answers "how do these two specific outputs differ, and what are the cost implications?"

`ai-diff` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal use. The API returns structured `DiffResult` objects with per-output metrics, diff hunks, and similarity scores. The CLI prints terminal-formatted output with ANSI colors and exits with conventional codes (0 for identical, 1 for differences found, 2 for configuration/usage errors). Both interfaces support multiple diff modes, configurable metrics display, and pluggable input sources.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `diff(outputA, outputB, options?)` function that computes a text diff between two LLM outputs, annotates it with AI-specific metrics (token counts, cost, latency, similarity, length), and returns a structured `DiffResult`.
- Provide a `diffOutputs(outputs, options?)` function that compares N LLM outputs pairwise, producing a `MultiDiffResult` with all pairwise diffs and a comparative metrics table.
- Provide a `compare(prompt, models, llmFn, options?)` function that sends a prompt to multiple models via a user-provided LLM function, collects the outputs with timing and token data, and returns a `ComparisonResult` containing the outputs, pairwise diffs, and a comparative metrics summary.
- Provide a `formatDiff(result, format?)` function that renders a `DiffResult`, `MultiDiffResult`, or `ComparisonResult` into a terminal-formatted string, JSON string, or markdown string.
- Support five diff modes: `unified` (git-style unified diff with word-level granularity), `side-by-side` (two-column display with aligned paragraphs), `inline` (inline additions and deletions within the text), `metrics` (metrics comparison table only, no text diff), and `json` (structural diff for JSON outputs with key-level change detection).
- Compute and display AI-specific metrics alongside every diff: output token count, input token count (if available), estimated cost per output (using model pricing data), response latency (if available), similarity score (Jaccard lexical similarity), and length statistics (word count, sentence count, character count).
- Display a metrics summary table at the top or bottom of every diff output, showing a side-by-side comparison of all metrics for each output.
- Accept inputs from multiple sources: files on disk, strings passed directly, JSON objects with metadata (model, tokens, cost, latency), stdin with a configurable delimiter, and live API calls (provide a prompt and model list, call each model, diff the results).
- Provide a CLI (`ai-diff`) with file arguments, flags for diff mode and metrics display, stdin piping support, live comparison mode, and deterministic exit codes.
- Detect terminal width and adapt output formatting accordingly. Disable ANSI colors when output is not a TTY or when `NO_COLOR` is set.
- Integrate with `model-price-registry` for cost estimation, `llm-vcr` for comparing recorded responses, and `prompt-diff` for combined prompt+output diffing workflows.
- Ship complete TypeScript type definitions. All public types are exported.
- Keep runtime dependencies minimal: depend only on `diff` (jsdiff) for the text diffing algorithm. All other functionality uses Node.js built-ins.

### Non-Goals

- **Not a regression testing framework.** This package compares individual outputs or small sets of outputs. It does not manage test suites, define test cases, compute aggregate pass rates, or enforce thresholds. For batch regression testing across test sets, use `llm-regression` from this monorepo.
- **Not a prompt diff tool.** This package diffs LLM outputs (the text that comes back from the model). It does not parse or diff prompt templates. For prompt template diffing, use `prompt-diff` from this monorepo. The two packages are complementary: `prompt-diff` answers "how did the prompt change?", `ai-diff` answers "how did the output change?"
- **Not an LLM evaluation framework.** This package does not judge output quality, grade correctness, or score against rubrics. It shows what changed between outputs and what the cost/performance tradeoffs are. For quality evaluation, use `output-grade` or `rag-eval-node-ts` from this monorepo.
- **Not an embedding provider.** Similarity scores use Jaccard (lexical, word-level) by default. Semantic similarity via embeddings requires the caller to provide an `embedFn`. The package does not ship an embedding model or call any embedding API.
- **Not a cost calculator.** While the package estimates and displays per-output costs, it is not a comprehensive cost analysis tool. It uses model pricing data to annotate diffs with approximate costs. For detailed cost comparison across models and providers, use `ai-cost-compare` from this monorepo.
- **Not an interactive diff viewer.** This package produces terminal output and structured data. It does not provide a TUI (terminal user interface) with scrolling, folding, or navigation. The output is designed for terminal display, piping to files, and CI logs.
- **Not a general-purpose text diff library.** This package is specialized for LLM outputs. For diffing arbitrary text, use `jsdiff` directly. For diffing source code, use `difftastic`. `ai-diff` wraps `jsdiff` and adds AI-specific context.

---

## 3. Target Users and Use Cases

### Prompt Engineers Comparing Model Outputs

Engineers iterating on prompts who need to see exactly how the output changes when they modify the prompt. They run the same prompt through a model before and after a change, pipe both outputs to `ai-diff`, and see a word-level diff with metrics showing the token count and cost impact. "The new prompt produces a 15% longer output that costs $0.003 more per call -- is the additional detail worth it?"

### Engineers Evaluating Models

Teams deciding which model to use for a specific task. They send the same prompt to GPT-4o, Claude Sonnet, and Gemini Pro, and use `ai-diff --prompt "question" --models gpt-4o,claude-sonnet,gemini-pro` to see a comparative view: how the outputs differ textually, how they compare on token usage and cost, and which model responds fastest. The metrics table provides a quick comparison matrix; the text diffs show the substantive differences in content and style.

### Prompt Engineers Exploring Parameters

Engineers testing how parameter changes (temperature, max tokens, system prompt variations) affect output. They run the same prompt with temperature 0 and temperature 0.7, diff the outputs, and see how deterministic the model is at each setting. The similarity score quantifies the variation: "at temperature 0, repeated runs produce Jaccard similarity 0.98; at temperature 0.7, similarity drops to 0.72."

### CI Pipeline Output Comparison

Teams that compare LLM outputs in CI to detect unexpected changes. A CI step calls the model with a known prompt, diffs the output against a stored baseline, and fails if the diff exceeds a threshold or the cost increases beyond a budget. The JSON output mode provides machine-readable diff data for automated analysis.

### Developers Comparing Structured Outputs

Engineers working with LLM-generated JSON (tool calls, structured data extraction, API responses) who need to see exactly which fields changed between two outputs. The `json` diff mode parses both outputs as JSON, computes a structural diff showing added/removed/modified keys, and displays changed values with context.

### Teams Tracking Cost and Performance

Engineers who need to understand the cost and performance implications of prompt or model changes. Each diff shows token counts and estimated costs side by side. Over time, these comparisons inform decisions about model selection, prompt optimization, and budget management.

---

## 4. Core Concepts

### LLM Output

An LLM Output (`LLMOutput`) is the fundamental input to `ai-diff`. It represents one response from an LLM, optionally annotated with metadata:

- **text**: The output text content (required). This is the string returned by the LLM.
- **model**: The model identifier that produced this output (optional). Used for labeling in diffs and for cost estimation. Examples: `'gpt-4o'`, `'claude-sonnet-4-20250514'`, `'gemini-pro'`.
- **tokens**: Token counts associated with this output (optional). An object with `input` (prompt tokens) and `output` (completion tokens). If provided, these are displayed in the metrics table. If not provided, output tokens are estimated from the text using a heuristic (characters / 4).
- **cost**: The cost of generating this output in USD (optional). If not provided but `model` and `tokens` are available, cost is estimated using model pricing data.
- **latency**: The time taken to generate this output in milliseconds (optional). If provided, displayed in the metrics table. If generating outputs live via `compare()`, latency is measured automatically.
- **metadata**: Arbitrary key-value pairs for labeling and annotation (optional). Displayed in the output header.

When a plain string is passed instead of an `LLMOutput` object, it is treated as `{ text: string }` with no metadata.

### Diff Result

A `DiffResult` is the output of comparing two LLM outputs. It contains:

- **hunks**: The text diff broken into hunks (contiguous groups of changes), each containing unchanged, added, and removed segments at the word level or line level.
- **metrics**: A `DiffMetrics` object comparing the two outputs on AI-specific dimensions (tokens, cost, latency, similarity, length).
- **identical**: Boolean indicating whether the two outputs are textually identical.
- **similarity**: A 0-1 Jaccard similarity score measuring lexical overlap.
- **outputA / outputB**: The original `LLMOutput` objects (with any estimated fields filled in).

### Diff Metrics

`DiffMetrics` is a structured comparison of AI-specific measurements between two outputs:

- **tokens**: `{ a: { input, output }, b: { input, output } }` -- token counts for each output.
- **cost**: `{ a: number, b: number, delta: number, deltaPercent: number }` -- estimated cost in USD.
- **latency**: `{ a: number, b: number, delta: number }` -- response time in milliseconds (if available).
- **similarity**: `{ jaccard: number, semantic?: number }` -- lexical (and optionally semantic) similarity scores.
- **length**: `{ a: { words, sentences, characters }, b: { words, sentences, characters } }` -- length measurements.
- **model**: `{ a: string, b: string }` -- model identifiers (if available).

### Diff Mode

The diff mode controls how the text difference is computed and displayed:

- **unified**: A git-style unified diff showing removed lines (red) and added lines (green) with surrounding context. Within changed lines, word-level differences are highlighted. This is the default mode and is best for seeing exactly what changed.
- **side-by-side**: Two columns showing the full text of each output, with corresponding paragraphs aligned horizontally. Changed words are highlighted within each column. Best for comparing two complete outputs where the reader wants to see both in their entirety.
- **inline**: The text is displayed once, with deletions shown as struck-through (red) and additions shown as highlighted (green) inline within the flow of text. Best for prose where changes are scattered and context is important.
- **metrics**: Only the metrics comparison table is displayed, with no text diff. Best for quick cost/performance comparisons when the text content is not the focus.
- **json**: Both outputs are parsed as JSON, and a structural diff is computed showing added, removed, and modified keys with their values. Best for comparing structured LLM outputs (tool calls, JSON responses, structured extractions).

### Similarity Score

The similarity score quantifies how alike two outputs are, independent of the text diff. Two scores are available:

- **Jaccard similarity** (always computed): Word-level set intersection over union. Tokenizes both outputs into word sets (lowercased, punctuation removed), computes `|A intersection B| / |A union B|`. Ranges from 0.0 (no shared words) to 1.0 (identical word sets). Fast, deterministic, no external dependencies.
- **Semantic similarity** (optional, requires `embedFn`): Cosine similarity between embedding vectors. Captures meaning equivalence across paraphrases and rewording. Ranges from 0.0 to 1.0. Requires the caller to provide an `embedFn: (text: string) => Promise<number[]>`.

---

## 5. Comparison Modes

### 5.1 Unified Diff

**Mode ID**: `'unified'`

The default mode. Produces a git-style unified diff with word-level granularity within changed lines.

**How it works**:

1. Split both outputs into lines.
2. Compute a line-level diff using the Myers algorithm (via `jsdiff`'s `diffLines`).
3. For changed line pairs, compute a word-level diff using `jsdiff`'s `diffWords` to highlight the specific words that changed within the line.
4. Render with ANSI colors: removed lines/words in red, added lines/words in green, unchanged context in default terminal color.
5. Show 3 lines of context around each change (configurable via `contextLines`).
6. Prefix removed lines with `-` and added lines with `+`, following unified diff convention.

**When to use**: The general-purpose default. Best when you want to see exactly what changed with minimal noise. Good for line-oriented outputs, code, and structured text.

**Example output**:

```
  The capital of France is Paris.
- It has a population of approximately 2.1 million people.
+ It has a population of approximately 2.2 million residents in the city proper.
  Paris is known for the Eiffel Tower and the Louvre Museum.
+ The city also hosts the annual Tour de France finish.
```

### 5.2 Side-by-Side

**Mode ID**: `'side-by-side'`

Two-column display with aligned content. Each column shows the full output, with corresponding paragraphs or lines placed at the same vertical position.

**How it works**:

1. Detect terminal width. Divide available width into two equal columns with a vertical separator.
2. Split both outputs into paragraphs (separated by blank lines) or lines (configurable).
3. Align paragraphs using a longest-common-subsequence algorithm on paragraph hashes.
4. For aligned paragraph pairs, compute word-level diffs and highlight changed words in each column (red in the left column for removed words, green in the right column for added words).
5. For unmatched paragraphs, show the paragraph in its column with the corresponding column empty.
6. Wrap long lines to fit within the column width.

**When to use**: When you want to read both outputs in their entirety and compare them visually. Best for prose, narratives, and outputs where overall structure and flow matter.

**Minimum terminal width**: 80 columns. If the terminal is narrower than 80 columns, falls back to unified mode with a warning.

**Example output**:

```
Output A (gpt-4o)                    | Output B (claude-sonnet)
─────────────────────────────────────|─────────────────────────────────────
The capital of France is Paris.      | The capital of France is Paris.
It has a population of approximately | It has a population of approximately
2.1 million people.                  | 2.2 million residents in the city
                                     | proper.
Paris is known for the Eiffel Tower  | Paris is known for the Eiffel Tower
and the Louvre Museum.               | and the Louvre Museum. The city also
                                     | hosts the annual Tour de France
                                     | finish.
```

### 5.3 Inline

**Mode ID**: `'inline'`

Additions and deletions are shown inline within a single rendered text, using color to distinguish them.

**How it works**:

1. Compute a word-level diff between the two outputs using `jsdiff`'s `diffWords`.
2. Render the result as a single text stream: unchanged words in default color, removed words in red with strikethrough, added words in green with underline.
3. The reader sees a merged view of both outputs with changes highlighted in place.

**When to use**: When changes are small and scattered throughout the text. Best for comparing outputs that are mostly identical with minor wording changes. Avoids the visual overhead of showing two full copies or a diff with context lines.

**Example output** (simulated without ANSI):

```
The capital of France is Paris. It has a population of approximately
~~2.1 million people.~~ __2.2 million residents in the city proper.__
Paris is known for the Eiffel Tower and the Louvre Museum.
__The city also hosts the annual Tour de France finish.__
```

### 5.4 Metrics

**Mode ID**: `'metrics'`

Displays only the metrics comparison table, with no text diff. The table shows all available metrics for each output side by side.

**How it works**:

1. Compute token counts, cost estimates, latency, similarity scores, and length statistics.
2. Render a formatted table with rows for each metric and columns for each output.
3. Include delta columns showing the difference and percentage change.

**When to use**: When you only care about cost, performance, and high-level similarity, not the specific textual differences. Useful for quick model comparison ("which model is cheaper for this prompt?") and for piping structured metrics into downstream analysis.

**Example output**:

```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ Metric           │ Output A     │ Output B     │ Delta        │
│                  │ (gpt-4o)     │ (claude)     │              │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Output tokens    │ 847          │ 1,203        │ +356 (+42%)  │
│ Input tokens     │ 125          │ 125          │ 0            │
│ Cost             │ $0.0042      │ $0.0060      │ +$0.0018     │
│ Latency          │ 1,240ms      │ 980ms        │ -260ms       │
│ Words            │ 634          │ 891          │ +257 (+41%)  │
│ Sentences        │ 28           │ 41           │ +13 (+46%)   │
│ Characters       │ 3,388        │ 4,812        │ +1,424 (+42%)│
│ Jaccard sim.     │              │              │ 0.68         │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

### 5.5 JSON Diff

**Mode ID**: `'json'`

Structural diff for JSON outputs. Parses both outputs as JSON and computes a key-level diff.

**How it works**:

1. Parse both outputs as JSON. If either fails to parse, fall back to unified text diff with a warning.
2. Recursively walk both JSON objects in parallel:
   a. Keys present in A but not B: marked as `removed`.
   b. Keys present in B but not A: marked as `added`.
   c. Keys present in both with different values: marked as `changed`, with `before` and `after` values.
   d. Keys present in both with identical values: marked as `unchanged`.
3. For arrays: compare elements by index. Report added/removed elements at the end and changed elements at matching indices.
4. Render with ANSI colors: removed keys/values in red, added keys/values in green, changed values showing before (red) and after (green).

**When to use**: When comparing structured LLM outputs -- tool call arguments, JSON data extraction results, structured API responses. Line-level text diff on JSON is noisy (key reordering, whitespace differences); JSON diff shows meaningful structural changes.

**Example output**:

```
{
    "answer": "Paris is the capital of France.",
-   "confidence": 0.95,
+   "confidence": 0.98,
    "sources": [
      "Wikipedia",
+     "Encyclopaedia Britannica"
    ],
-   "language": "en"
}
```

---

## 6. AI-Specific Metrics

### 6.1 Token Counts

**What is measured**: The number of tokens consumed by each output. Two counts are tracked:

- **Input tokens** (`tokens.input`): The number of tokens in the prompt sent to the model. If provided in the `LLMOutput` metadata, this value is used directly. If not provided, it is omitted from the display (not estimated, because prompt content is not available to `ai-diff`).
- **Output tokens** (`tokens.output`): The number of tokens in the model's response. If provided in the `LLMOutput` metadata, this value is used directly. If not provided, it is estimated using a heuristic: `Math.ceil(text.length / 4)`. This heuristic approximates BPE tokenization for English text and is accurate to within 10-20% for typical LLM outputs.

**Why it matters**: Token counts directly determine cost (most providers charge per token) and are a proxy for output length and verbosity. Comparing token counts across models or prompt versions reveals whether a change made the model more or less verbose.

**Display**: Shown as integers in the metrics table, with delta and percentage change for output tokens.

### 6.2 Cost Estimation

**What is measured**: The estimated monetary cost of generating each output, in US dollars.

**How it is computed**:

1. If `cost` is provided directly in the `LLMOutput` metadata, that value is used.
2. If `model` and `tokens` are provided, cost is computed as: `cost = (tokens.input * inputPricePerToken) + (tokens.output * outputPricePerToken)`. Per-token prices are looked up from a built-in pricing table or from `model-price-registry` if installed.
3. If neither is available, cost is omitted from the display.

**Built-in pricing table**: The package ships with a static pricing table for common models (GPT-4o, GPT-4o-mini, GPT-3.5-turbo, Claude Opus, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash). This table is a snapshot and may become outdated. For up-to-date pricing, install `model-price-registry` as a peer dependency.

**Display**: Shown as USD with 4 decimal places (e.g., `$0.0042`), with delta showing the cost difference.

### 6.3 Latency

**What is measured**: The wall-clock time taken to generate each output, in milliseconds.

**How it is obtained**:

1. If `latency` is provided in the `LLMOutput` metadata, that value is used.
2. If outputs are generated live via `compare()`, latency is measured automatically using `performance.now()` from the start to the end of each LLM call.
3. If not available, latency is omitted from the display.

**Display**: Shown in milliseconds with comma formatting for readability (e.g., `1,240ms`), with delta showing the time difference.

### 6.4 Similarity Scores

**What is measured**: How textually and semantically similar the two outputs are, quantified as a 0-1 score.

**Jaccard similarity** (always computed):

1. Tokenize both outputs into word sets: split on whitespace, lowercase, remove punctuation.
2. Compute `|A intersection B| / |A union B|`.
3. Score of 1.0 means identical word sets. Score of 0.0 means no shared words.

**Semantic similarity** (optional):

1. Requires the caller to provide `embedFn: (text: string) => Promise<number[]>`.
2. Computes embedding vectors for both outputs.
3. Returns cosine similarity: `dot(a, b) / (norm(a) * norm(b))`.

**Display**: Shown as a decimal with 2 places (e.g., `0.68`). When both Jaccard and semantic are available, both are shown. The similarity score provides a quick "how different are these?" signal without reading the full diff.

### 6.5 Length Statistics

**What is measured**: The physical dimensions of each output.

- **Word count**: Number of whitespace-separated tokens.
- **Sentence count**: Number of sentences, detected by terminal punctuation (`.`, `!`, `?`) followed by whitespace or end of string.
- **Character count**: Total characters including whitespace.

**Display**: Shown as integers with delta and percentage change. Length comparison reveals whether a model or prompt change made the output more concise or more verbose.

### 6.6 Model Information

**What is displayed**: The model identifier for each output, shown as labels in the column headers and in the metrics table. If model names are not provided, outputs are labeled as "Output A" and "Output B" (or by filename for file inputs).

### 6.7 Metrics Summary Table

Every diff output (except `metrics` mode, which is the table alone) includes a metrics summary table either above or below the text diff (configurable, default: above). The table provides a compact comparison of all available metrics, enabling the reader to assess cost and performance implications before reading the textual differences.

---

## 7. Input Sources

### 7.1 Files

The simplest input mode. Two file paths are provided, and their contents are compared as LLM outputs.

```bash
ai-diff output-gpt4.txt output-claude.txt
```

File contents are read as UTF-8 text. If a file has a `.json` extension, `ai-diff` attempts to parse it as an `LLMOutput` JSON object (with `text`, `model`, `tokens`, etc. fields). If parsing succeeds, the metadata is used for metrics. If parsing fails, the raw file content is treated as the output text.

### 7.2 Strings (Programmatic API)

The API accepts plain strings or `LLMOutput` objects:

```typescript
import { diff } from 'ai-diff';

// Plain strings
const result = diff('Output from model A', 'Output from model B');

// With metadata
const result = diff(
  { text: 'Output from GPT-4o', model: 'gpt-4o', tokens: { input: 125, output: 847 } },
  { text: 'Output from Claude', model: 'claude-sonnet', tokens: { input: 125, output: 1203 } },
);
```

### 7.3 Stdin with Delimiter

Two outputs can be piped via stdin, separated by a configurable delimiter (default: `---`):

```bash
cat <<'EOF' | ai-diff --stdin
Output from model A goes here.
Multiple lines are fine.
---
Output from model B goes here.
It can also span multiple lines.
EOF
```

The delimiter line must appear on its own line, with no leading or trailing whitespace (other than the newline). The delimiter is configurable via `--delimiter`.

### 7.4 JSON Input

A JSON file or stdin stream containing structured output data:

```bash
ai-diff --json comparison.json
```

The JSON format:

```json
{
  "a": {
    "text": "Output from GPT-4o...",
    "model": "gpt-4o",
    "tokens": { "input": 125, "output": 847 },
    "cost": 0.0042,
    "latency": 1240
  },
  "b": {
    "text": "Output from Claude...",
    "model": "claude-sonnet",
    "tokens": { "input": 125, "output": 1203 },
    "cost": 0.0060,
    "latency": 980
  }
}
```

This format preserves all metadata. It is also the format produced by `compare()` when serialized, enabling save-and-replay workflows.

### 7.5 Live API Calls

The `compare()` function (and CLI `--prompt` mode) sends a prompt to multiple models and diffs the results:

```bash
ai-diff --prompt "Explain quantum computing in 3 sentences" --models gpt-4o,claude-sonnet
```

Programmatically:

```typescript
import { compare } from 'ai-diff';

const result = await compare(
  'Explain quantum computing in 3 sentences',
  ['gpt-4o', 'claude-sonnet'],
  myLlmFunction,
);
```

The `llmFn` is a user-provided function with the signature:

```typescript
type LLMFn = (prompt: string, model: string) => Promise<LLMOutput | string>;
```

### 7.6 llm-vcr Cassettes

Compare recorded LLM responses from `llm-vcr` cassette files:

```bash
ai-diff --cassette recording-v1.json --cassette recording-v2.json
```

The cassette files are `llm-vcr` recordings containing the prompt, model, response, and metadata. `ai-diff` extracts the response text and metadata from each cassette and compares them. This enables comparing LLM outputs across time without re-calling the API.

---

## 8. Live Comparison Mode

### Overview

Live comparison mode sends a prompt to multiple models, collects the outputs with timing and token data, and produces a comparative diff. This is the "try it and compare" workflow for model evaluation.

### Pipeline

1. **Receive prompt and model list**: The user provides a prompt string and a list of model identifiers.
2. **Call models in parallel**: For each model, call the user-provided `llmFn(prompt, model)`. All calls are made concurrently using `Promise.allSettled` to maximize throughput and measure individual latencies accurately.
3. **Collect outputs**: Each resolved call produces an `LLMOutput` (or a plain string that is wrapped in an `LLMOutput`). Latency is measured by wrapping each call in timing logic (`performance.now()` before and after).
4. **Handle failures**: If a model call fails, the failure is recorded with the error message. The comparison continues with the remaining successful outputs. The metrics table shows "ERROR" for the failed model with the error message.
5. **Compute pairwise diffs**: For N successful outputs, compute N*(N-1)/2 pairwise diffs.
6. **Build comparative metrics table**: Produce a single table with one column per model and rows for all metrics.
7. **Return ComparisonResult**: Contains the prompt, the model list, the individual `LLMOutput` objects, the pairwise `DiffResult` objects, the comparative metrics table, and the overall timing.

### Parallel Execution

All model calls are made in parallel by default. This is important for accurate latency measurement -- sequential calls would add queueing delay. The `concurrency` option limits the number of simultaneous calls (default: unlimited). When `concurrency` is set, calls are dispatched in batches of the specified size using a simple semaphore.

### CLI Usage

```bash
# Requires LLM_FN environment variable or --llm-command flag
ai-diff --prompt "What is the capital of France?" --models gpt-4o,claude-sonnet

# With a shell command as the LLM function
ai-diff --prompt "What is the capital of France?" --models gpt-4o,claude-sonnet \
  --llm-command 'curl -s https://api.example.com/v1/chat -d "{\"model\": \"$MODEL\", \"prompt\": \"$PROMPT\"}"'
```

In CLI mode, the `--llm-command` flag specifies a shell command template. `ai-diff` substitutes `$PROMPT` with the prompt text and `$MODEL` with the model identifier, executes the command, and captures stdout as the output text.

---

## 9. API Surface

### Installation

```bash
npm install ai-diff
```

### Main Export: `diff`

Compares two LLM outputs and returns a `DiffResult`.

```typescript
import { diff } from 'ai-diff';

const result = diff(
  { text: 'Paris is the capital of France.', model: 'gpt-4o', tokens: { input: 10, output: 8 } },
  { text: 'The capital of France is Paris.', model: 'claude-sonnet', tokens: { input: 10, output: 8 } },
  { mode: 'unified' },
);

console.log(result.identical);          // false
console.log(result.similarity.jaccard); // 1.0 (same words, different order)
console.log(result.metrics.tokens);     // { a: { input: 10, output: 8 }, b: { input: 10, output: 8 } }
```

**Signature:**

```typescript
function diff(
  outputA: string | LLMOutput,
  outputB: string | LLMOutput,
  options?: DiffOptions,
): DiffResult;
```

### Export: `diffOutputs`

Compares N LLM outputs pairwise.

```typescript
import { diffOutputs } from 'ai-diff';

const result = diffOutputs([
  { text: 'Output from GPT-4o', model: 'gpt-4o' },
  { text: 'Output from Claude', model: 'claude-sonnet' },
  { text: 'Output from Gemini', model: 'gemini-pro' },
]);

console.log(result.pairwise.length); // 3 (A-B, A-C, B-C)
console.log(result.metricsTable);    // Comparative table with 3 columns
```

**Signature:**

```typescript
function diffOutputs(
  outputs: (string | LLMOutput)[],
  options?: DiffOptions,
): MultiDiffResult;
```

### Export: `compare`

Sends a prompt to multiple models and compares the outputs.

```typescript
import { compare } from 'ai-diff';

const result = await compare(
  'What is the capital of France?',
  ['gpt-4o', 'claude-sonnet'],
  async (prompt, model) => {
    const response = await callMyLLM(prompt, model);
    return { text: response.text, tokens: response.usage, model };
  },
);

console.log(result.outputs.length);   // 2
console.log(result.pairwise.length);  // 1
console.log(result.metricsTable);     // Comparative metrics
```

**Signature:**

```typescript
function compare(
  prompt: string,
  models: string[],
  llmFn: LLMFn,
  options?: CompareOptions,
): Promise<ComparisonResult>;
```

### Export: `formatDiff`

Renders a diff result into a formatted string.

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(outputA, outputB);

console.log(formatDiff(result, 'terminal'));   // ANSI-colored terminal output
console.log(formatDiff(result, 'json'));        // JSON string
console.log(formatDiff(result, 'markdown'));    // Markdown for PR comments
console.log(formatDiff(result, 'plain'));       // Plain text without ANSI codes
```

**Signature:**

```typescript
type OutputFormat = 'terminal' | 'json' | 'markdown' | 'plain';

function formatDiff(
  result: DiffResult | MultiDiffResult | ComparisonResult,
  format: OutputFormat,
): string;
```

### Type Definitions

```typescript
// ── Input Types ──────────────────────────────────────────────────────

/** An LLM output with optional metadata. */
interface LLMOutput {
  /** The output text content. */
  text: string;

  /** The model identifier that produced this output. */
  model?: string;

  /** Token counts for this output. */
  tokens?: {
    /** Number of prompt/input tokens. */
    input?: number;
    /** Number of completion/output tokens. */
    output?: number;
  };

  /** Cost of generating this output in USD. */
  cost?: number;

  /** Response latency in milliseconds. */
  latency?: number;

  /** Arbitrary metadata for labeling and annotation. */
  metadata?: Record<string, unknown>;
}

/** A user-provided LLM function for live comparison mode. */
type LLMFn = (prompt: string, model: string) => Promise<LLMOutput | string>;

// ── Options ──────────────────────────────────────────────────────────

/** Diff mode. */
type DiffMode = 'unified' | 'side-by-side' | 'inline' | 'metrics' | 'json';

/** Options for diff() and diffOutputs(). */
interface DiffOptions {
  /** Diff mode. Default: 'unified'. */
  mode?: DiffMode;

  /** Number of unchanged context lines around changes (unified mode). Default: 3. */
  contextLines?: number;

  /** User-provided embedding function for semantic similarity. */
  embedFn?: (text: string) => Promise<number[]>;

  /** Pricing overrides for cost estimation. Per-token prices in USD. */
  pricing?: Record<string, { input: number; output: number }>;

  /** Whether to show the metrics summary table. Default: true. */
  showMetrics?: boolean;

  /** Position of the metrics table. Default: 'top'. */
  metricsPosition?: 'top' | 'bottom';

  /** Which metrics to display. Default: all available. */
  metrics?: ('tokens' | 'cost' | 'latency' | 'similarity' | 'length' | 'model')[];

  /** Terminal width override (for side-by-side mode). Default: auto-detected. */
  width?: number;

  /** Whether to use ANSI colors. Default: auto-detected (true if TTY). */
  color?: boolean;

  /** Custom labels for the outputs. Default: model names or 'Output A'/'Output B'. */
  labels?: string[];
}

/** Options for compare(). Extends DiffOptions. */
interface CompareOptions extends DiffOptions {
  /** Maximum number of concurrent model calls. Default: unlimited. */
  concurrency?: number;

  /** Timeout per model call in milliseconds. Default: 30000. */
  timeout?: number;

  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

// ── Result Types ─────────────────────────────────────────────────────

/** A segment of a text diff. */
interface DiffSegment {
  /** The text content of this segment. */
  text: string;

  /** Whether this segment was added, removed, or unchanged. */
  type: 'added' | 'removed' | 'unchanged';
}

/** A contiguous group of changes. */
interface DiffHunk {
  /** Line number in output A where this hunk starts (1-based). */
  lineA: number;

  /** Line number in output B where this hunk starts (1-based). */
  lineB: number;

  /** The segments (lines or words) in this hunk. */
  segments: DiffSegment[];
}

/** Length measurements for an output. */
interface LengthStats {
  /** Number of whitespace-separated words. */
  words: number;

  /** Number of sentences. */
  sentences: number;

  /** Total characters including whitespace. */
  characters: number;
}

/** Comparative metrics between two outputs. */
interface DiffMetrics {
  /** Token counts for each output. */
  tokens: {
    a: { input?: number; output: number };
    b: { input?: number; output: number };
  };

  /** Cost for each output in USD. */
  cost?: {
    a: number;
    b: number;
    delta: number;
    deltaPercent: number;
  };

  /** Latency for each output in milliseconds. */
  latency?: {
    a: number;
    b: number;
    delta: number;
  };

  /** Similarity scores between the two outputs. */
  similarity: {
    jaccard: number;
    semantic?: number;
  };

  /** Length measurements for each output. */
  length: {
    a: LengthStats;
    b: LengthStats;
  };

  /** Model identifiers. */
  model?: {
    a?: string;
    b?: string;
  };
}

/** A change in a JSON diff. */
interface JsonChange {
  /** JSON path to the changed key (e.g., 'response.data.items[0].name'). */
  path: string;

  /** Type of change. */
  type: 'added' | 'removed' | 'changed';

  /** Value before the change (undefined for additions). */
  before?: unknown;

  /** Value after the change (undefined for removals). */
  after?: unknown;
}

/** Result of comparing two LLM outputs. */
interface DiffResult {
  /** Whether the two outputs are textually identical. */
  identical: boolean;

  /** Text diff hunks. Empty if identical or mode is 'metrics'. */
  hunks: DiffHunk[];

  /** JSON changes. Populated only in 'json' mode. */
  jsonChanges?: JsonChange[];

  /** AI-specific comparative metrics. */
  metrics: DiffMetrics;

  /** Similarity scores. */
  similarity: {
    jaccard: number;
    semantic?: number;
  };

  /** The original output A (with estimated fields filled in). */
  outputA: LLMOutput;

  /** The original output B (with estimated fields filled in). */
  outputB: LLMOutput;

  /** The diff mode that was used. */
  mode: DiffMode;

  /** Wall-clock time for the diff computation in milliseconds. */
  durationMs: number;

  /** ISO 8601 timestamp of when the diff was performed. */
  timestamp: string;
}

/** Result of comparing N outputs pairwise. */
interface MultiDiffResult {
  /** The original outputs. */
  outputs: LLMOutput[];

  /** Pairwise diff results. Length is N*(N-1)/2. */
  pairwise: Array<{
    /** Index of the first output. */
    indexA: number;
    /** Index of the second output. */
    indexB: number;
    /** The diff result. */
    result: DiffResult;
  }>;

  /** Comparative metrics table data (one column per output). */
  metricsTable: {
    labels: string[];
    outputTokens: number[];
    inputTokens: (number | undefined)[];
    costs: (number | undefined)[];
    latencies: (number | undefined)[];
    wordCounts: number[];
    sentenceCounts: number[];
    characterCounts: number[];
  };

  /** Wall-clock time for all comparisons in milliseconds. */
  durationMs: number;

  /** ISO 8601 timestamp. */
  timestamp: string;
}

/** Result of live comparison across models. */
interface ComparisonResult extends MultiDiffResult {
  /** The prompt that was sent to all models. */
  prompt: string;

  /** The model identifiers that were called. */
  models: string[];

  /** Per-model call results (includes failures). */
  calls: Array<{
    model: string;
    status: 'success' | 'error';
    output?: LLMOutput;
    error?: string;
    latencyMs: number;
  }>;
}
```

### Example: Basic Diff with Metrics

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(
  {
    text: 'Paris is the capital of France. It has a population of about 2.1 million.',
    model: 'gpt-4o',
    tokens: { input: 15, output: 18 },
    latency: 1240,
  },
  {
    text: 'The capital of France is Paris, with approximately 2.2 million residents.',
    model: 'claude-sonnet',
    tokens: { input: 15, output: 16 },
    latency: 980,
  },
);

console.log(formatDiff(result, 'terminal'));
```

### Example: Compare Three Models

```typescript
import { compare, formatDiff } from 'ai-diff';

const result = await compare(
  'Explain the theory of relativity in 2 sentences.',
  ['gpt-4o', 'claude-sonnet', 'gemini-pro'],
  myLlmFunction,
);

// Print the comparative metrics table
console.log(formatDiff(result, 'terminal'));

// Access individual pairwise diffs
for (const pair of result.pairwise) {
  console.log(`${result.outputs[pair.indexA].model} vs ${result.outputs[pair.indexB].model}:`);
  console.log(`  Similarity: ${pair.result.similarity.jaccard.toFixed(2)}`);
}
```

### Example: JSON Diff

```typescript
import { diff, formatDiff } from 'ai-diff';

const result = diff(
  '{"answer": "Paris", "confidence": 0.95, "sources": ["Wikipedia"]}',
  '{"answer": "Paris", "confidence": 0.98, "sources": ["Wikipedia", "Britannica"]}',
  { mode: 'json' },
);

console.log(result.jsonChanges);
// [
//   { path: 'confidence', type: 'changed', before: 0.95, after: 0.98 },
//   { path: 'sources[1]', type: 'added', after: 'Britannica' },
// ]
```

---

## 10. Terminal Formatting

### ANSI Color Scheme

All terminal output uses ANSI escape codes for coloring. The color scheme follows widely established conventions from `git diff` and terminal diff tools:

| Element | Color | ANSI Code |
|---|---|---|
| Removed text | Red | `\x1b[31m` |
| Added text | Green | `\x1b[32m` |
| Changed/highlighted | Yellow | `\x1b[33m` |
| Model labels / headers | Cyan | `\x1b[36m` |
| Metrics table borders | Dim white | `\x1b[2m` |
| Unchanged text | Default | `\x1b[0m` |
| Metric delta (positive) | Red (more expensive/slower) | `\x1b[31m` |
| Metric delta (negative) | Green (cheaper/faster) | `\x1b[32m` |

### Word-Level Highlighting

In unified and side-by-side modes, changes within a line are highlighted at the word level. The line is shown in the change color (red for removed, green for added), with the specifically changed words shown in bold + inverse to make them stand out:

```
- It has a population of approximately \x1b[1;7m2.1 million people.\x1b[0;31m
+ It has a population of approximately \x1b[1;7m2.2 million residents in the city proper.\x1b[0;32m
```

This two-level highlighting (line-level color + word-level bold/inverse) helps the reader quickly identify exactly which words changed within a changed line.

### Width Awareness

Terminal width is detected using `process.stdout.columns` (default: 80 if not available). This affects:

- **Side-by-side mode**: Column width is `(terminalWidth - 3) / 2` (accounting for the `|` separator and padding). Lines longer than the column width are wrapped.
- **Metrics table**: Table width adapts to content width, with a minimum width and maximum of terminal width.
- **Unified mode**: No wrapping; lines are displayed at their natural width.

### Non-TTY Output

When stdout is not a TTY (piping to a file, to another command, or in CI environments), or when the `NO_COLOR` environment variable is set:

- All ANSI escape codes are omitted.
- Diff markers (`-` and `+` prefixes) are preserved for readability.
- The metrics table uses ASCII characters instead of Unicode box-drawing characters.
- The `--color` flag forces ANSI colors on; `--no-color` forces them off.

### Header and Footer

Every diff output includes:

**Header** (printed before the diff):

```
ai-diff v0.1.0

Comparing: gpt-4o vs claude-sonnet
Mode: unified
```

**Metrics table** (printed at the configured position, default: above the diff). See Section 5.4 for format.

**Footer** (printed after the diff):

```
Analyzed in 4ms
```

---

## 11. Configuration

### Programmatic Configuration

All configuration is passed via the `DiffOptions` or `CompareOptions` objects. There is no configuration file for the programmatic API.

### Default Values

| Option | Default | Description |
|---|---|---|
| `mode` | `'unified'` | Diff mode. |
| `contextLines` | `3` | Context lines around changes (unified mode). |
| `showMetrics` | `true` | Whether to show the metrics summary table. |
| `metricsPosition` | `'top'` | Position of the metrics table. |
| `metrics` | All available | Which metrics to display. |
| `width` | Auto-detected | Terminal width. |
| `color` | Auto-detected | Whether to use ANSI colors. |
| `concurrency` | Unlimited | Max concurrent model calls (compare mode). |
| `timeout` | `30_000` | Timeout per model call in ms (compare mode). |

### Environment Variables

| Environment Variable | Equivalent Flag | Description |
|---|---|---|
| `AI_DIFF_MODE` | `--mode` | Default diff mode. |
| `AI_DIFF_WIDTH` | `--width` | Terminal width override. |
| `NO_COLOR` | `--no-color` | Disable ANSI colors. |
| `AI_DIFF_METRICS` | `--metrics` | Comma-separated list of metrics to show. |

---

## 12. CLI Interface

### Installation and Invocation

```bash
# Global install
npm install -g ai-diff
ai-diff output-a.txt output-b.txt

# npx (no install)
npx ai-diff output-a.txt output-b.txt

# Package script
# package.json: { "scripts": { "diff": "ai-diff" } }
npm run diff -- output-a.txt output-b.txt
```

### CLI Binary Name

`ai-diff`

### Commands and Flags

```
ai-diff <file-a> <file-b> [options]
ai-diff --stdin [options]
ai-diff --json <file> [options]
ai-diff --prompt <text> --models <list> [options]

Positional arguments:
  file-a                   Path to the first output file.
  file-b                   Path to the second output file.

Input options:
  --stdin                  Read two outputs from stdin, separated by --delimiter.
  --delimiter <str>        Delimiter between outputs in stdin mode. Default: '---'.
  --json <file>            Read outputs from a JSON file (see JSON Input format).
  --cassette <file>        Read output from an llm-vcr cassette file (repeatable,
                           provide twice for two cassettes to compare).

Live comparison:
  --prompt <text>          Prompt text to send to models for live comparison.
  --models <list>          Comma-separated list of model identifiers.
  --llm-command <cmd>      Shell command template for LLM calls.
                           Use $PROMPT and $MODEL as placeholders.
  --concurrency <n>        Max concurrent model calls. Default: unlimited.
  --timeout <ms>           Timeout per model call in ms. Default: 30000.

Diff options:
  --mode <mode>            Diff mode. Values: unified, side-by-side, inline,
                           metrics, json. Default: unified.
  --context <n>            Context lines around changes (unified mode). Default: 3.
  --word-diff              Force word-level diff in unified mode (default behavior).
  --line-diff              Use line-level diff instead of word-level.

Metrics options:
  --no-metrics             Hide the metrics summary table.
  --metrics-position <pos> Position of metrics table. Values: top, bottom.
                           Default: top.
  --metrics <list>         Comma-separated list of metrics to show.
                           Values: tokens, cost, latency, similarity, length, model.
                           Default: all available.

Display options:
  --format <format>        Output format. Values: terminal, json, markdown, plain.
                           Default: terminal.
  --width <n>              Terminal width override (for side-by-side mode).
  --color                  Force ANSI colors on.
  --no-color               Force ANSI colors off.
  --label-a <name>         Custom label for output A.
  --label-b <name>         Custom label for output B.

General:
  --version                Print version and exit.
  --help                   Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Outputs are identical. No differences found. |
| `1` | Differences found. Outputs are not identical. |
| `2` | Configuration error. Invalid flags, missing input files, file read failure, or invalid input. |

### CLI Examples

```bash
# Compare two output files
ai-diff response-gpt4.txt response-claude.txt

# Side-by-side comparison
ai-diff response-gpt4.txt response-claude.txt --mode side-by-side

# Metrics only (no text diff)
ai-diff response-gpt4.txt response-claude.txt --mode metrics

# JSON structured diff
ai-diff tool-call-a.json tool-call-b.json --mode json

# Compare via stdin
echo "Output A\n---\nOutput B" | ai-diff --stdin

# Live comparison against two models
ai-diff --prompt "What is the capital of France?" --models gpt-4o,claude-sonnet \
  --llm-command 'my-llm-cli --model $MODEL --prompt "$PROMPT"'

# Output as JSON for programmatic consumption
ai-diff response-a.txt response-b.txt --format json > diff-result.json

# Output as markdown for PR comments
ai-diff response-a.txt response-b.txt --format markdown | gh pr comment 123 --body-file -

# Compare llm-vcr cassettes
ai-diff --cassette recording-v1.json --cassette recording-v2.json

# Only show cost and latency metrics
ai-diff response-a.txt response-b.txt --metrics cost,latency --mode metrics

# Custom labels
ai-diff response-a.txt response-b.txt --label-a "Before prompt change" --label-b "After prompt change"
```

### Terminal Output Example

```
$ ai-diff response-gpt4.txt response-claude.txt

  ai-diff v0.1.0

  Comparing: gpt-4o vs claude-sonnet
  Mode: unified

  ┌──────────────────┬──────────────┬──────────────┬──────────────┐
  │ Metric           │ gpt-4o       │ claude       │ Delta        │
  ├──────────────────┼──────────────┼──────────────┼──────────────┤
  │ Output tokens    │ 847          │ 1,203        │ +356 (+42%)  │
  │ Input tokens     │ 125          │ 125          │ 0            │
  │ Cost             │ $0.0042      │ $0.0060      │ +$0.0018     │
  │ Latency          │ 1,240ms      │ 980ms        │ -260ms       │
  │ Similarity       │              │              │ 0.68         │
  │ Words            │ 634          │ 891          │ +257 (+41%)  │
  └──────────────────┴──────────────┴──────────────┴──────────────┘

   The capital of France is Paris.
-  It has a population of approximately 2.1 million people.
+  It has a population of approximately 2.2 million residents
+  in the city proper.
   Paris is known for the Eiffel Tower and the Louvre Museum.
+  The city also hosts the annual Tour de France finish.

  Analyzed in 4ms
```

---

## 13. Integration

### prompt-diff

`prompt-diff` diffs the prompts; `ai-diff` diffs the outputs. Used together, they provide a complete picture of a prompt change: "here is how the prompt changed, and here is how the output changed as a result."

**Workflow**:

```bash
# See how the prompt changed
prompt-diff prompts/v1.md prompts/v2.md

# See how the output changed
ai-diff outputs/v1-response.txt outputs/v2-response.txt
```

Programmatically, both packages can be composed in a single script:

```typescript
import { diff as promptDiff } from 'prompt-diff';
import { diff as outputDiff } from 'ai-diff';

const promptChanges = promptDiff(promptV1, promptV2);
const outputChanges = outputDiff(outputV1, outputV2);

console.log('Prompt changes:', promptChanges.summary);
console.log('Output changes:', outputChanges.similarity.jaccard);
```

### llm-regression

`llm-regression` performs batch regression testing across test sets. `ai-diff` provides the visual diff for individual test cases within a regression report. When `llm-regression` detects a regression, the developer can use `ai-diff` to inspect the specific baseline vs. candidate outputs in detail.

```typescript
import { compareBatch } from 'llm-regression';
import { diff, formatDiff } from 'ai-diff';

const report = await compareBatch(testCases);

for (const result of report.results.filter(r => r.classification === 'regression')) {
  console.log(`Regression in test case ${result.id}:`);
  const d = diff(result.baseline, result.candidate);
  console.log(formatDiff(d, 'terminal'));
}
```

### model-price-registry

`ai-diff` uses `model-price-registry` (if installed as a peer dependency) for up-to-date model pricing data. When `model-price-registry` is not installed, `ai-diff` falls back to its built-in static pricing table.

```typescript
// If model-price-registry is installed, ai-diff automatically uses it
// for cost estimation. No additional configuration needed.
```

### ai-cost-compare

`ai-cost-compare` provides comprehensive cost comparison across models and providers. `ai-diff` provides a more focused view: the cost of two specific outputs side by side. For cost-focused analysis, use `ai-cost-compare`. For output comparison with cost as one of several metrics, use `ai-diff`.

### llm-vcr

`ai-diff` can read `llm-vcr` cassette files directly, extracting the response text and metadata for comparison. This enables comparing recorded LLM responses without re-calling the API.

```bash
ai-diff --cassette before-update.json --cassette after-update.json
```

---

## 14. Testing Strategy

### Unit Tests

Unit tests verify each component in isolation.

- **Diff engine tests**: Test word-level and line-level diff computation with known inputs. Verify that identical texts produce zero hunks. Verify that completely different texts produce a single hunk covering the entire content. Verify that minor edits produce precise hunks with correct context lines.

- **JSON diff tests**: Test structural comparison of JSON objects. Verify added/removed/changed key detection. Test nested objects, arrays, mixed types. Test with invalid JSON (should fall back gracefully).

- **Metrics computation tests**: Test token count estimation (characters / 4 heuristic). Test cost estimation with known model pricing. Test Jaccard similarity with known word sets. Test length statistics (word count, sentence count, character count).

- **Similarity tests**: Test Jaccard similarity with identical texts (1.0), completely different texts (0.0), and partially overlapping texts (known expected value). Test with empty strings. Test case insensitivity and punctuation handling.

- **Formatter tests**: Test terminal formatter with known diff results and verify ANSI escape codes are correct. Test JSON formatter produces valid JSON. Test markdown formatter produces valid markdown. Test plain formatter omits all ANSI codes. Test non-TTY detection.

- **Metrics table tests**: Verify table rendering with various combinations of available metrics (some outputs have latency, some do not; some have cost, some do not). Verify column alignment and delta formatting.

- **Input parsing tests**: Test file reading, stdin splitting with custom delimiters, JSON input parsing, and `LLMOutput` object validation.

- **CLI argument parsing tests**: Verify flag parsing, environment variable fallback, default values, error messages for invalid input, and exit code behavior.

### Integration Tests

Integration tests run the full pipeline (input parsing, diff computation, metrics, formatting).

- **Identical outputs**: Diff two identical outputs. Assert `identical: true`, zero hunks, Jaccard similarity 1.0.
- **Minor edit**: Diff two outputs differing by a few words. Assert correct hunks, metrics, and similarity score.
- **Completely different**: Diff two unrelated outputs. Assert low similarity, comprehensive hunks.
- **JSON outputs**: Diff two JSON strings in `json` mode. Assert correct `jsonChanges`.
- **Multi-output comparison**: Compare 3 outputs. Assert 3 pairwise diffs and a correct metrics table.
- **Live comparison**: Mock the LLM function, run `compare()`, verify outputs, diffs, and timing.
- **File input**: Write temp files, run `diff()` via the CLI, verify exit code and stdout.
- **Stdin input**: Pipe test data via stdin, verify correct splitting and diffing.
- **Non-TTY output**: Verify that piped output contains no ANSI codes.

### Edge Cases

- Empty output (empty string).
- Two empty outputs (identical).
- One empty output, one non-empty (all additions).
- Output containing only whitespace.
- Very long output (100KB+) -- performance test.
- Output containing ANSI escape codes (should not interfere with diff formatting).
- Output containing Unicode (emoji, CJK characters, RTL text).
- JSON mode with non-JSON input (should fall back gracefully).
- Live comparison where one model call fails.
- Live comparison where all model calls fail.
- Terminal width of 40 (below minimum for side-by-side).
- Missing model pricing data (cost should be omitted, not error).

### Test Framework

Tests use Vitest, matching the project's existing `package.json` configuration. Test fixtures are stored in `src/__tests__/fixtures/`.

---

## 15. Performance

### Diff Computation

The text diff algorithm (provided by `jsdiff`) uses the Myers algorithm with O(n * d) time complexity, where `n` is the text length and `d` is the edit distance. For two typical LLM outputs (1,000-5,000 characters each, small edit distance), the diff completes in under 2ms. For two very different outputs (10,000 characters each, large edit distance), the diff completes in under 20ms.

### JSON Diff

JSON diffing recursively walks both objects. For typical JSON outputs (10-50 keys, 2-3 levels of nesting), the diff completes in under 1ms. For large JSON objects (1,000+ keys), the diff completes in under 10ms.

### Metrics Computation

Jaccard similarity requires tokenizing both texts into word sets and computing set intersection/union. For two 5,000-character outputs (~1,000 words each), this completes in under 1ms. Token counting, cost estimation, and length statistics are O(n) string scans, each completing in under 0.5ms.

### Formatting

Terminal formatting (ANSI code insertion, table rendering) is a single pass over the diff result. For a diff with 20 hunks, formatting completes in under 1ms. Side-by-side mode adds word-wrapping computation, which is O(n) in the number of lines. Total formatting time for a typical diff: under 2ms.

### Overall

For a typical two-output comparison (5,000 characters each, moderate differences): total time from input to formatted output is under 10ms. For a three-model live comparison (excluding LLM call time), total diff + metrics + formatting time is under 30ms.

### Memory

The `DiffResult` holds references to both original outputs plus the diff hunks. For two 10KB outputs, the result object is approximately 100KB (original texts + hunks + metrics). This is well within acceptable limits. For very large outputs (1MB each), the result may reach 5-10MB, which is still manageable.

---

## 16. Dependencies

### Runtime Dependencies

| Dependency | Version | Purpose | Size |
|---|---|---|---|
| `diff` (jsdiff) | `^7.0.0` | Word-level and line-level text diff algorithms (`diffWords`, `diffLines`). | ~50KB |

### Why One Dependency

- **`diff` (jsdiff)**: Re-implementing the Myers diff algorithm for word-level and line-level diffing is not justified. `jsdiff` is the standard library for this in the JavaScript ecosystem (7M+ weekly npm downloads), is well-tested, and provides exactly the algorithms needed. The implementation-specific code in `ai-diff` -- AI metrics, terminal formatting, JSON diffing, multi-output comparison -- is all custom.
- **No `chalk`/`colors`**: Terminal coloring uses raw ANSI escape codes. Color detection uses `process.stdout.isTTY` and `NO_COLOR`. No dependency needed.
- **No `cli-table3`**: Table rendering is implemented with simple string padding and box-drawing characters. The table format is fixed and simple enough to not warrant a dependency.
- **No `commander`/`yargs`**: CLI argument parsing uses `node:util.parseArgs` (available since Node.js 18).
- **No tokenizer**: Token estimation uses the characters/4 heuristic. Exact tokenization is a non-goal.

### Peer Dependencies (Optional)

| Dependency | Purpose |
|---|---|
| `model-price-registry` | Up-to-date model pricing for cost estimation. Falls back to built-in static table if not installed. |

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter for source code. |

---

## 17. File Structure

```
ai-diff/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  src/
    index.ts                        Public API exports: diff, diffOutputs,
                                    compare, formatDiff, and all types.
    cli.ts                          CLI entry point: argument parsing, input
                                    handling, formatting, exit codes.
    types.ts                        All TypeScript type definitions.
    diff.ts                         Core diff() function: compute text diff,
                                    compute metrics, build DiffResult.
    multi-diff.ts                   diffOutputs() function: pairwise comparison
                                    of N outputs.
    compare.ts                      compare() function: live comparison across
                                    models with parallel execution.
    engine/
      text-diff.ts                  Text diff computation using jsdiff. Wraps
                                    diffWords and diffLines, produces DiffHunk
                                    arrays.
      json-diff.ts                  JSON structural diff. Recursive object
                                    comparison producing JsonChange arrays.
      similarity.ts                 Jaccard similarity computation. Word
                                    tokenization, set operations, optional
                                    semantic similarity via embedFn.
    metrics/
      index.ts                      Metrics computation orchestrator.
      tokens.ts                     Token counting: use provided values or
                                    estimate via characters/4.
      cost.ts                       Cost estimation: lookup model pricing,
                                    compute per-output cost.
      length.ts                     Length statistics: word count, sentence
                                    count, character count.
      pricing.ts                    Built-in static model pricing table.
                                    Optional model-price-registry integration.
    formatters/
      index.ts                      Formatter factory: dispatches to specific
                                    formatters based on OutputFormat.
      terminal.ts                   ANSI-colored terminal output. Unified diff,
                                    side-by-side, inline modes.
      json.ts                       JSON output.
      markdown.ts                   Markdown output for PR comments.
      plain.ts                      Plain text output without ANSI codes.
      metrics-table.ts              Metrics summary table rendering. Shared
                                    by all formatters.
    input/
      file.ts                       File input: read files, detect JSON format,
                                    extract LLMOutput.
      stdin.ts                      Stdin input: read from stdin, split by
                                    delimiter.
      json-input.ts                 JSON input: parse structured JSON input
                                    files.
      cassette.ts                   llm-vcr cassette reading: extract response
                                    text and metadata.
    utils/
      ansi.ts                       ANSI escape code helpers. Color detection
                                    (TTY, NO_COLOR).
      text.ts                       Text utilities: word tokenization, sentence
                                    splitting, whitespace normalization.
      table.ts                      ASCII/Unicode table rendering.
  src/__tests__/
    diff.test.ts                    Unit tests for core diff function.
    multi-diff.test.ts              Unit tests for diffOutputs.
    compare.test.ts                 Unit tests for live comparison.
    engine/
      text-diff.test.ts             Text diff algorithm tests.
      json-diff.test.ts             JSON diff tests.
      similarity.test.ts            Similarity computation tests.
    metrics/
      tokens.test.ts                Token counting tests.
      cost.test.ts                  Cost estimation tests.
      length.test.ts                Length statistics tests.
    formatters/
      terminal.test.ts              Terminal formatter tests.
      json.test.ts                  JSON formatter tests.
      markdown.test.ts              Markdown formatter tests.
      metrics-table.test.ts         Metrics table rendering tests.
    input/
      file.test.ts                  File input tests.
      stdin.test.ts                 Stdin input tests.
      json-input.test.ts            JSON input parsing tests.
    cli.test.ts                     CLI end-to-end tests.
    fixtures/
      output-gpt4.txt               Sample GPT-4 output.
      output-claude.txt              Sample Claude output.
      output-gemini.txt              Sample Gemini output.
      structured-a.json             Sample JSON output A.
      structured-b.json             Sample JSON output B.
      comparison-input.json          Sample JSON input file.
      cassette-v1.json               Sample llm-vcr cassette.
      cassette-v2.json               Sample llm-vcr cassette.
  bin/
    ai-diff.js                      CLI binary entry point.
  dist/                             Compiled output (gitignored).
```

---

## 18. Implementation Roadmap

### Phase 1: Core Diff and Metrics (v0.1.0)

Implement the core diff engine, AI-specific metrics, and basic terminal output.

**Deliverables:**
- `diff()` function: accepts two `LLMOutput` objects or strings, computes word-level text diff using `jsdiff`, returns `DiffResult`.
- `unified` diff mode with ANSI-colored terminal output.
- AI-specific metrics: token count estimation, Jaccard similarity, length statistics (word count, sentence count, character count).
- Metrics summary table rendering with Unicode box-drawing characters.
- `formatDiff()` function with `terminal` and `json` output formats.
- File input: read two files, detect JSON format for metadata extraction.
- CLI with positional file arguments, `--mode`, `--format`, `--no-metrics`, and exit codes.
- Type definitions for all public types.
- Unit tests for diff engine, metrics, similarity, and formatters.
- Integration tests with fixture files.

### Phase 2: Additional Modes and Input Sources (v0.2.0)

Add remaining diff modes, stdin input, and JSON input.

**Deliverables:**
- `side-by-side` diff mode with terminal-width-aware column layout.
- `inline` diff mode with inline additions/deletions.
- `metrics` mode (metrics table only, no text diff).
- `json` diff mode with structural JSON comparison.
- Stdin input with configurable delimiter.
- JSON input format parsing.
- `markdown` and `plain` output formats.
- `--label-a`, `--label-b` custom label flags.
- Cost estimation with built-in static pricing table.
- Non-TTY detection and plain text fallback.
- Environment variable configuration.

### Phase 3: Multi-Output and Live Comparison (v0.3.0)

Add multi-output comparison and live model calling.

**Deliverables:**
- `diffOutputs()` function for pairwise comparison of N outputs.
- `compare()` function for live comparison across models.
- Parallel model execution with `Promise.allSettled`.
- `--prompt`, `--models`, and `--llm-command` CLI flags.
- `--concurrency` and `--timeout` flags.
- Comparative metrics table with N columns.
- Error handling for failed model calls.
- Latency measurement for live calls.
- `ComparisonResult` type with per-model call data.

### Phase 4: Integrations and Polish (v1.0.0)

Add ecosystem integrations, semantic similarity, and prepare for stable release.

**Deliverables:**
- `model-price-registry` integration as optional peer dependency.
- `llm-vcr` cassette reading with `--cassette` flag.
- Optional semantic similarity via user-provided `embedFn`.
- `--metrics-position` flag.
- Performance optimization for large outputs.
- Complete README with usage examples, output samples, and configuration guide.
- API stability guarantee (semver major version).
- Comprehensive edge case testing.

---

## 19. Example Use Cases

### 19.1 Model Comparison: GPT-4o vs Claude Sonnet

A prompt engineer wants to decide which model to use for a customer support chatbot.

```bash
ai-diff --prompt "A customer asks: 'Can I return a product after 45 days?' \
  Our policy allows returns within 30 days." \
  --models gpt-4o,claude-sonnet \
  --llm-command 'my-llm-cli --model $MODEL --prompt "$PROMPT"'
```

**What the output shows**: The text diff reveals that GPT-4o gives a shorter, more direct answer while Claude Sonnet provides a more empathetic response with alternative suggestions. The metrics table shows that Claude's response uses 40% more tokens and costs $0.002 more per call, but has lower latency. The engineer decides GPT-4o is better for cost-sensitive high-volume support, while Claude is better for premium support tiers.

### 19.2 Prompt Iteration: Before and After Adding Constraints

A developer tightens the system prompt to produce more concise outputs.

```bash
ai-diff output-before-constraint.txt output-after-constraint.txt \
  --label-a "Without length constraint" --label-b "With 'max 3 sentences' constraint"
```

**What the output shows**: The diff reveals that the constrained prompt produces a response 60% shorter (from 5 sentences to 3). The metrics table confirms a 60% reduction in output tokens and proportional cost savings. The Jaccard similarity is 0.45 -- the core information is preserved but the elaboration is removed. The developer confirms the constraint works as intended.

### 19.3 Temperature Exploration

An engineer tests how temperature affects output consistency.

```typescript
import { compare, formatDiff } from 'ai-diff';

const results = await Promise.all([
  compare('Explain quantum entanglement.', ['gpt-4o'], llmFn, {}),
  compare('Explain quantum entanglement.', ['gpt-4o'], llmFn, {}),
  compare('Explain quantum entanglement.', ['gpt-4o'], llmFn, {}),
]);

// Compare the three runs
const multiResult = diffOutputs(results.map(r => r.outputs[0]));
console.log(formatDiff(multiResult, 'terminal'));
```

**What the output shows**: At temperature 0, the three outputs have pairwise Jaccard similarity of 0.95+ (near-identical). At temperature 0.7, similarity drops to 0.60-0.75 (significant variation). The diffs show exactly which phrases and facts vary between runs, helping the engineer understand the model's confidence distribution across the response.

### 19.4 Structured Output Diff

An engineer modifies a prompt that produces JSON tool calls and needs to verify the output schema is stable.

```bash
ai-diff tool-call-v1.json tool-call-v2.json --mode json
```

**What the output shows**: The JSON diff reveals that the v2 prompt adds a new `reasoning` field to the output, changes the `confidence` value from 0.95 to 0.98, and adds a second entry to the `sources` array. The engineer confirms these are the intended changes and no fields were unexpectedly added or removed.

### 19.5 CI Pipeline: Output Regression Detection

A CI pipeline compares LLM output against a stored baseline on every PR.

```bash
# Generate fresh output
my-llm-cli --prompt "$(cat prompts/system.md)" --model gpt-4o > /tmp/current-output.txt

# Compare against stored baseline
ai-diff baselines/system-prompt-output.txt /tmp/current-output.txt --format json > /tmp/diff.json

# Check similarity threshold
SIMILARITY=$(node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/diff.json','utf8')); console.log(d.similarity.jaccard)")

if (( $(echo "$SIMILARITY < 0.70" | bc -l) )); then
  echo "WARN: Output has diverged significantly from baseline (similarity: $SIMILARITY)"
  ai-diff baselines/system-prompt-output.txt /tmp/current-output.txt --format markdown | gh pr comment $PR --body-file -
fi
```

### 19.6 Cost-Focused Model Selection

A team needs the cheapest model that produces acceptable output quality.

```bash
ai-diff --prompt "Summarize this article: $(cat article.txt)" \
  --models gpt-4o,gpt-4o-mini,claude-haiku \
  --mode metrics
```

**What the output shows**: The metrics-only table shows token counts, costs, and latencies side by side for all three models. GPT-4o-mini costs 5x less than GPT-4o with only 10% fewer tokens. Claude Haiku is the cheapest but produces 30% fewer tokens. The team can quickly identify the cost-quality sweet spot without reading through full diff output.
