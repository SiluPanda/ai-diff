"use strict";
// ai-diff - Compare LLM responses across models with semantic diffs
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseColor = exports.renderJsonDiff = exports.renderSideBySide = exports.renderInlineDiff = exports.renderUnifiedDiff = exports.renderMetricsTable = exports.getModelPricing = exports.estimateCost = exports.computeMetrics = exports.computeLengthStats = exports.embeddingCosineSimilarity = exports.compositeSimilarity = exports.exactMatchRatio = exports.cosineSimilarity = exports.jaccardSimilarity = exports.diffJson = exports.diffLines = exports.diffWords = exports.tryParseJson = exports.tokenizeWords = exports.computeHunks = exports.estimateTokens = exports.enrichOutput = exports.normalizeOutput = void 0;
exports.diff = diff;
exports.diffOutputs = diffOutputs;
exports.compare = compare;
exports.formatDiff = formatDiff;
const diff_1 = require("./diff");
Object.defineProperty(exports, "normalizeOutput", { enumerable: true, get: function () { return diff_1.normalizeOutput; } });
Object.defineProperty(exports, "enrichOutput", { enumerable: true, get: function () { return diff_1.enrichOutput; } });
Object.defineProperty(exports, "estimateTokens", { enumerable: true, get: function () { return diff_1.estimateTokens; } });
Object.defineProperty(exports, "computeHunks", { enumerable: true, get: function () { return diff_1.computeHunks; } });
Object.defineProperty(exports, "diffWords", { enumerable: true, get: function () { return diff_1.diffWords; } });
Object.defineProperty(exports, "diffLines", { enumerable: true, get: function () { return diff_1.diffLines; } });
Object.defineProperty(exports, "diffJson", { enumerable: true, get: function () { return diff_1.diffJson; } });
Object.defineProperty(exports, "tryParseJson", { enumerable: true, get: function () { return diff_1.tryParseJson; } });
Object.defineProperty(exports, "tokenizeWords", { enumerable: true, get: function () { return diff_1.tokenizeWords; } });
const similarity_1 = require("./similarity");
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return similarity_1.jaccardSimilarity; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return similarity_1.cosineSimilarity; } });
Object.defineProperty(exports, "exactMatchRatio", { enumerable: true, get: function () { return similarity_1.exactMatchRatio; } });
Object.defineProperty(exports, "compositeSimilarity", { enumerable: true, get: function () { return similarity_1.compositeSimilarity; } });
Object.defineProperty(exports, "embeddingCosineSimilarity", { enumerable: true, get: function () { return similarity_1.embeddingCosineSimilarity; } });
Object.defineProperty(exports, "computeLengthStats", { enumerable: true, get: function () { return similarity_1.computeLengthStats; } });
const metrics_1 = require("./metrics");
Object.defineProperty(exports, "computeMetrics", { enumerable: true, get: function () { return metrics_1.computeMetrics; } });
Object.defineProperty(exports, "estimateCost", { enumerable: true, get: function () { return metrics_1.estimateCost; } });
Object.defineProperty(exports, "getModelPricing", { enumerable: true, get: function () { return metrics_1.getModelPricing; } });
const formatters_1 = require("./formatters");
Object.defineProperty(exports, "renderMetricsTable", { enumerable: true, get: function () { return formatters_1.renderMetricsTable; } });
Object.defineProperty(exports, "renderUnifiedDiff", { enumerable: true, get: function () { return formatters_1.renderUnifiedDiff; } });
Object.defineProperty(exports, "renderInlineDiff", { enumerable: true, get: function () { return formatters_1.renderInlineDiff; } });
Object.defineProperty(exports, "renderSideBySide", { enumerable: true, get: function () { return formatters_1.renderSideBySide; } });
Object.defineProperty(exports, "renderJsonDiff", { enumerable: true, get: function () { return formatters_1.renderJsonDiff; } });
Object.defineProperty(exports, "shouldUseColor", { enumerable: true, get: function () { return formatters_1.shouldUseColor; } });
// ── Main API ──
/**
 * Compare two LLM outputs and return a DiffResult.
 */
function diff(outputA, outputB, options) {
    const startTime = performance.now();
    const mode = options?.mode ?? 'unified';
    const normA = (0, diff_1.normalizeOutput)(outputA);
    const normB = (0, diff_1.normalizeOutput)(outputB);
    const enrichedA = (0, diff_1.enrichOutput)(normA);
    const enrichedB = (0, diff_1.enrichOutput)(normB);
    const identical = enrichedA.text === enrichedB.text;
    // Compute hunks
    let hunks = [];
    let jsonChanges;
    if (!identical && mode !== 'metrics') {
        if (mode === 'json') {
            const jsonA = (0, diff_1.tryParseJson)(enrichedA.text);
            const jsonB = (0, diff_1.tryParseJson)(enrichedB.text);
            if (jsonA !== null && jsonB !== null) {
                jsonChanges = (0, diff_1.diffJson)(jsonA, jsonB);
            }
            // Also compute text hunks as fallback
            hunks = (0, diff_1.computeHunks)(enrichedA.text, enrichedB.text, options?.contextLines ?? 3);
        }
        else {
            hunks = (0, diff_1.computeHunks)(enrichedA.text, enrichedB.text, options?.contextLines ?? 3);
        }
    }
    // Compute similarity
    const jaccard = (0, similarity_1.jaccardSimilarity)(enrichedA.text, enrichedB.text);
    // Compute metrics synchronously (without embedFn)
    const lengthA = (0, similarity_1.computeLengthStats)(enrichedA.text);
    const lengthB = (0, similarity_1.computeLengthStats)(enrichedB.text);
    const costA = (0, metrics_1.estimateCost)(enrichedA, options?.pricing);
    const costB = (0, metrics_1.estimateCost)(enrichedB, options?.pricing);
    let cost;
    if (costA !== undefined && costB !== undefined) {
        const delta = costB - costA;
        const deltaPercent = costA !== 0 ? (delta / costA) * 100 : (costB !== 0 ? 100 : 0);
        cost = { a: costA, b: costB, delta, deltaPercent };
    }
    let latency;
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
    const metrics = {
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
function diffOutputs(outputs, options) {
    const startTime = performance.now();
    const normalized = outputs.map(o => (0, diff_1.enrichOutput)((0, diff_1.normalizeOutput)(o)));
    const pairwise = [];
    for (let i = 0; i < normalized.length; i++) {
        for (let j = i + 1; j < normalized.length; j++) {
            const result = diff(normalized[i], normalized[j], options);
            pairwise.push({ indexA: i, indexB: j, result });
        }
    }
    const metricsTable = {
        labels: normalized.map((o, i) => o.model || `Output ${String.fromCharCode(65 + i)}`),
        outputTokens: normalized.map(o => o.tokens?.output ?? 0),
        inputTokens: normalized.map(o => o.tokens?.input),
        costs: normalized.map(o => (0, metrics_1.estimateCost)(o, options?.pricing)),
        latencies: normalized.map(o => o.latency),
        wordCounts: normalized.map(o => (0, similarity_1.computeLengthStats)(o.text).words),
        sentenceCounts: normalized.map(o => (0, similarity_1.computeLengthStats)(o.text).sentences),
        characterCounts: normalized.map(o => (0, similarity_1.computeLengthStats)(o.text).characters),
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
async function compare(prompt, models, llmFn, options) {
    const startTime = performance.now();
    const calls = [];
    const successOutputs = [];
    // Execute calls (with optional concurrency limit)
    const concurrency = options?.concurrency ?? models.length;
    const timeout = options?.timeout ?? 30000;
    const executeCall = async (model) => {
        const callStart = performance.now();
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
            });
            const resultPromise = llmFn(prompt, model);
            const raw = await Promise.race([resultPromise, timeoutPromise]);
            const latencyMs = performance.now() - callStart;
            const output = (0, diff_1.normalizeOutput)(raw);
            output.model = output.model || model;
            output.latency = output.latency ?? latencyMs;
            const enriched = (0, diff_1.enrichOutput)(output);
            return { model, status: 'success', output: enriched, latencyMs };
        }
        catch (err) {
            const latencyMs = performance.now() - callStart;
            const error = err instanceof Error ? err.message : String(err);
            return { model, status: 'error', error, latencyMs };
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
function formatDiff(result, format = 'terminal') {
    const useColor = format === 'terminal' ? (0, formatters_1.shouldUseColor)(true) : false;
    if (format === 'json') {
        return JSON.stringify(result, null, 2);
    }
    // Check if it's a DiffResult (has outputA/outputB)
    if ('outputA' in result && 'outputB' in result) {
        return formatSingleDiff(result, format, useColor);
    }
    // Multi-result or comparison
    if ('pairwise' in result) {
        return formatMultiDiff(result, format, useColor);
    }
    return JSON.stringify(result, null, 2);
}
function formatSingleDiff(result, format, useColor) {
    const parts = [];
    const labelA = result.outputA.model || 'Output A';
    const labelB = result.outputB.model || 'Output B';
    const showMetrics = true; // Default to true
    // Metrics table
    if (showMetrics) {
        parts.push((0, formatters_1.renderMetricsTable)(result.metrics, labelA, labelB, useColor));
        parts.push('');
    }
    // Diff content
    if (result.mode === 'metrics') {
        // Only metrics table, already rendered above
    }
    else if (result.mode === 'json' && result.jsonChanges) {
        parts.push((0, formatters_1.renderJsonDiff)(result.jsonChanges, result.outputA.text, result.outputB.text, useColor));
    }
    else if (result.mode === 'inline') {
        const wordDiff = (0, diff_1.diffWords)(result.outputA.text, result.outputB.text);
        parts.push((0, formatters_1.renderInlineDiff)(wordDiff, useColor));
    }
    else if (result.mode === 'side-by-side') {
        parts.push((0, formatters_1.renderSideBySide)(result, useColor));
    }
    else {
        // unified (default)
        parts.push((0, formatters_1.renderUnifiedDiff)(result, useColor));
    }
    return parts.join('\n');
}
function formatMultiDiff(result, format, useColor) {
    const parts = [];
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
//# sourceMappingURL=index.js.map