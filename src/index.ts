// ai-diff - Compare LLM responses across models with semantic diffs

import {
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
} from './types';

import {
  normalizeOutput,
  enrichOutput,
  estimateTokens,
  computeHunks,
  diffWords as computeWordDiff,
  diffLines as computeLineDiff,
  diffJson as computeJsonDiff,
  tryParseJson,
  tokenizeWords,
} from './diff';

import {
  jaccardSimilarity,
  cosineSimilarity,
  exactMatchRatio,
  compositeSimilarity,
  embeddingCosineSimilarity,
  computeLengthStats,
} from './similarity';

import { computeMetrics, estimateCost, getModelPricing } from './metrics';

import {
  renderMetricsTable,
  renderUnifiedDiff,
  renderInlineDiff,
  renderSideBySide,
  renderJsonDiff,
  shouldUseColor,
} from './formatters';

// ── Main API ──

/**
 * Compare two LLM outputs and return a DiffResult.
 */
export function diff(
  outputA: string | LLMOutput,
  outputB: string | LLMOutput,
  options?: DiffOptions,
): DiffResult {
  const startTime = performance.now();
  const mode: DiffMode = options?.mode ?? 'unified';

  const normA = normalizeOutput(outputA);
  const normB = normalizeOutput(outputB);
  const enrichedA = enrichOutput(normA);
  const enrichedB = enrichOutput(normB);

  const identical = enrichedA.text === enrichedB.text;

  // Compute hunks
  let hunks: DiffHunk[] = [];
  let jsonChanges: JsonChange[] | undefined;

  if (!identical && mode !== 'metrics') {
    if (mode === 'json') {
      const jsonA = tryParseJson(enrichedA.text);
      const jsonB = tryParseJson(enrichedB.text);
      if (jsonA !== null && jsonB !== null) {
        jsonChanges = computeJsonDiff(jsonA, jsonB);
      }
      // Also compute text hunks as fallback
      hunks = computeHunks(enrichedA.text, enrichedB.text, options?.contextLines ?? 3);
    } else {
      hunks = computeHunks(enrichedA.text, enrichedB.text, options?.contextLines ?? 3);
    }
  }

  // Compute similarity
  const jaccard = jaccardSimilarity(enrichedA.text, enrichedB.text);

  // Compute metrics synchronously (without embedFn)
  const lengthA = computeLengthStats(enrichedA.text);
  const lengthB = computeLengthStats(enrichedB.text);

  const costA = estimateCost(enrichedA, options?.pricing);
  const costB = estimateCost(enrichedB, options?.pricing);

  let cost: DiffMetrics['cost'];
  if (costA !== undefined && costB !== undefined) {
    const delta = costB - costA;
    const deltaPercent = costA !== 0 ? (delta / costA) * 100 : (costB !== 0 ? 100 : 0);
    cost = { a: costA, b: costB, delta, deltaPercent };
  }

  let latency: DiffMetrics['latency'];
  if (enrichedA.latency !== undefined && enrichedB.latency !== undefined) {
    latency = {
      a: enrichedA.latency,
      b: enrichedB.latency,
      delta: enrichedB.latency - enrichedA.latency,
    };
  }

  const model = (enrichedA.model || enrichedB.model)
    ? { a: enrichedA.model, b: enrichedB.model }
    : undefined;

  const metrics: DiffMetrics = {
    tokens: {
      a: { input: enrichedA.tokens?.input, output: enrichedA.tokens?.output ?? 0 },
      b: { input: enrichedB.tokens?.input, output: enrichedB.tokens?.output ?? 0 },
    },
    cost,
    latency,
    similarity: { jaccard },
    length: { a: lengthA, b: lengthB },
    model,
  };

  const durationMs = performance.now() - startTime;

  return {
    identical,
    hunks,
    jsonChanges,
    metrics,
    similarity: { jaccard },
    outputA: enrichedA,
    outputB: enrichedB,
    mode,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare N LLM outputs pairwise.
 */
export function diffOutputs(
  outputs: (string | LLMOutput)[],
  options?: DiffOptions,
): MultiDiffResult {
  const startTime = performance.now();

  const normalized = outputs.map(o => enrichOutput(normalizeOutput(o)));

  const pairwise: MultiDiffResult['pairwise'] = [];
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const result = diff(normalized[i], normalized[j], options);
      pairwise.push({ indexA: i, indexB: j, result });
    }
  }

  const metricsTable: MultiDiffResult['metricsTable'] = {
    labels: normalized.map((o, i) => o.model || `Output ${String.fromCharCode(65 + i)}`),
    outputTokens: normalized.map(o => o.tokens?.output ?? 0),
    inputTokens: normalized.map(o => o.tokens?.input),
    costs: normalized.map(o => estimateCost(o, options?.pricing)),
    latencies: normalized.map(o => o.latency),
    wordCounts: normalized.map(o => computeLengthStats(o.text).words),
    sentenceCounts: normalized.map(o => computeLengthStats(o.text).sentences),
    characterCounts: normalized.map(o => computeLengthStats(o.text).characters),
  };

  return {
    outputs: normalized,
    pairwise,
    metricsTable,
    durationMs: performance.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a prompt to multiple models and compare the outputs.
 */
export async function compare(
  prompt: string,
  models: string[],
  llmFn: LLMFn,
  options?: CompareOptions,
): Promise<ComparisonResult> {
  const startTime = performance.now();

  const calls: ComparisonResult['calls'] = [];
  const successOutputs: LLMOutput[] = [];

  // Execute calls (with optional concurrency limit)
  const concurrency = options?.concurrency ?? models.length;
  const timeout = options?.timeout ?? 30000;

  const executeCall = async (model: string): Promise<ComparisonResult['calls'][0]> => {
    const callStart = performance.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });

      const resultPromise = llmFn(prompt, model);
      const raw = await Promise.race([resultPromise, timeoutPromise]);

      const latencyMs = performance.now() - callStart;
      const output = normalizeOutput(raw);
      output.model = output.model || model;
      output.latency = output.latency ?? latencyMs;

      const enriched = enrichOutput(output);
      return { model, status: 'success' as const, output: enriched, latencyMs };
    } catch (err) {
      const latencyMs = performance.now() - callStart;
      const error = err instanceof Error ? err.message : String(err);
      return { model, status: 'error' as const, error, latencyMs };
    }
  };

  // Batch execution with concurrency
  for (let i = 0; i < models.length; i += concurrency) {
    const batch = models.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(m => executeCall(m)));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        calls.push(r.value);
        if (r.value.status === 'success' && r.value.output) {
          successOutputs.push(r.value.output);
        }
      }
    }
  }

  // Compute pairwise diffs
  const multiResult = diffOutputs(successOutputs, options);

  const totalDuration = performance.now() - startTime;

  return {
    prompt,
    models,
    calls,
    outputs: multiResult.outputs,
    pairwise: multiResult.pairwise,
    metricsTable: multiResult.metricsTable,
    durationMs: totalDuration,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a diff result into a displayable string.
 */
export function formatDiff(
  result: DiffResult | MultiDiffResult | ComparisonResult,
  format: OutputFormat = 'terminal',
): string {
  const useColor = format === 'terminal' ? shouldUseColor(true) : false;

  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  // Check if it's a DiffResult (has outputA/outputB)
  if ('outputA' in result && 'outputB' in result) {
    return formatSingleDiff(result as DiffResult, format, useColor);
  }

  // Multi-result or comparison
  if ('pairwise' in result) {
    return formatMultiDiff(result as MultiDiffResult, format, useColor);
  }

  return JSON.stringify(result, null, 2);
}

function formatSingleDiff(result: DiffResult, format: OutputFormat, useColor: boolean): string {
  const parts: string[] = [];

  const labelA = result.outputA.model || 'Output A';
  const labelB = result.outputB.model || 'Output B';

  const showMetrics = true; // Default to true

  // Metrics table
  if (showMetrics) {
    parts.push(renderMetricsTable(result.metrics, labelA, labelB, useColor));
    parts.push('');
  }

  // Diff content
  if (result.mode === 'metrics') {
    // Only metrics table, already rendered above
  } else if (result.mode === 'json' && result.jsonChanges) {
    parts.push(renderJsonDiff(result.jsonChanges, result.outputA.text, result.outputB.text, useColor));
  } else if (result.mode === 'inline') {
    const wordDiff = computeWordDiff(result.outputA.text, result.outputB.text);
    parts.push(renderInlineDiff(wordDiff, useColor));
  } else if (result.mode === 'side-by-side') {
    parts.push(renderSideBySide(result, useColor));
  } else {
    // unified (default)
    parts.push(renderUnifiedDiff(result, useColor));
  }

  return parts.join('\n');
}

function formatMultiDiff(result: MultiDiffResult, format: OutputFormat, useColor: boolean): string {
  const parts: string[] = [];

  // For each pairwise diff
  for (const pair of result.pairwise) {
    const labelA = result.outputs[pair.indexA].model || `Output ${String.fromCharCode(65 + pair.indexA)}`;
    const labelB = result.outputs[pair.indexB].model || `Output ${String.fromCharCode(65 + pair.indexB)}`;

    parts.push(`=== ${labelA} vs ${labelB} ===`);
    parts.push('');
    parts.push(formatSingleDiff(pair.result, format, useColor));
    parts.push('');
  }

  return parts.join('\n');
}

// ── Re-exports ──

// Types
export type {
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
};

// Utilities
export {
  normalizeOutput,
  enrichOutput,
  estimateTokens,
  computeHunks,
  tokenizeWords,
  tryParseJson,
};
export { computeWordDiff as diffWords };
export { computeLineDiff as diffLines };
export { computeJsonDiff as diffJson };

// Similarity
export {
  jaccardSimilarity,
  cosineSimilarity,
  exactMatchRatio,
  compositeSimilarity,
  embeddingCosineSimilarity,
  computeLengthStats,
};

// Metrics
export { computeMetrics, estimateCost, getModelPricing };

// Formatters
export {
  renderMetricsTable,
  renderUnifiedDiff,
  renderInlineDiff,
  renderSideBySide,
  renderJsonDiff,
  shouldUseColor,
};
