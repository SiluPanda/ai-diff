/** An LLM output with optional metadata. */
export interface LLMOutput {
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
export type LLMFn = (_prompt: string, _model: string) => Promise<LLMOutput | string>;
/** Diff mode. */
export type DiffMode = 'unified' | 'side-by-side' | 'inline' | 'metrics' | 'json';
/** Output format for formatDiff. */
export type OutputFormat = 'terminal' | 'json' | 'markdown' | 'plain';
/** Options for diff() and diffOutputs(). */
export interface DiffOptions {
    /** Diff mode. Default: 'unified'. */
    mode?: DiffMode;
    /** Number of unchanged context lines around changes (unified mode). Default: 3. */
    contextLines?: number;
    /** User-provided embedding function for semantic similarity. */
    embedFn?: (_text: string) => Promise<number[]>;
    /** Pricing overrides for cost estimation. Per-token prices in USD. */
    pricing?: Record<string, {
        input: number;
        output: number;
    }>;
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
export interface CompareOptions extends DiffOptions {
    /** Maximum number of concurrent model calls. Default: unlimited. */
    concurrency?: number;
    /** Timeout per model call in milliseconds. Default: 30000. */
    timeout?: number;
    /** AbortSignal for cancellation. */
    signal?: AbortSignal;
}
/** A segment of a text diff. */
export interface DiffSegment {
    /** The text content of this segment. */
    text: string;
    /** Whether this segment was added, removed, or unchanged. */
    type: 'added' | 'removed' | 'unchanged';
}
/** A contiguous group of changes. */
export interface DiffHunk {
    /** Line number in output A where this hunk starts (1-based). */
    lineA: number;
    /** Line number in output B where this hunk starts (1-based). */
    lineB: number;
    /** The segments (lines or words) in this hunk. */
    segments: DiffSegment[];
}
/** Length measurements for an output. */
export interface LengthStats {
    /** Number of whitespace-separated words. */
    words: number;
    /** Number of sentences. */
    sentences: number;
    /** Total characters including whitespace. */
    characters: number;
}
/** Comparative metrics between two outputs. */
export interface DiffMetrics {
    /** Token counts for each output. */
    tokens: {
        a: {
            input?: number;
            output: number;
        };
        b: {
            input?: number;
            output: number;
        };
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
export interface JsonChange {
    /** JSON path to the changed key. */
    path: string;
    /** Type of change. */
    type: 'added' | 'removed' | 'changed';
    /** Value before the change (undefined for additions). */
    before?: unknown;
    /** Value after the change (undefined for removals). */
    after?: unknown;
}
/** Result of comparing two LLM outputs. */
export interface DiffResult {
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
export interface MultiDiffResult {
    /** The original outputs. */
    outputs: LLMOutput[];
    /** Pairwise diff results. */
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
export interface ComparisonResult extends MultiDiffResult {
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
//# sourceMappingURL=types.d.ts.map