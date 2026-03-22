"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCost = estimateCost;
exports.computeMetrics = computeMetrics;
exports.getModelPricing = getModelPricing;
const similarity_1 = require("./similarity");
const diff_1 = require("./diff");
/** Built-in pricing table for common models (USD per token). */
const MODEL_PRICING = {
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    'gpt-3.5-turbo': { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
    'gpt-4-turbo': { input: 10 / 1_000_000, output: 30 / 1_000_000 },
    'claude-opus': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
    'claude-sonnet': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-haiku': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    'gemini-pro': { input: 0.5 / 1_000_000, output: 1.5 / 1_000_000 },
    'gemini-flash': { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
};
/**
 * Estimate cost for an LLM output based on model and token counts.
 */
function estimateCost(output, pricingOverrides) {
    if (output.cost !== undefined)
        return output.cost;
    if (!output.model || !output.tokens)
        return undefined;
    const pricing = pricingOverrides?.[output.model] ?? MODEL_PRICING[output.model];
    if (!pricing)
        return undefined;
    const inputCost = (output.tokens.input ?? 0) * pricing.input;
    const outputCost = (output.tokens.output ?? 0) * pricing.output;
    return inputCost + outputCost;
}
/**
 * Compute comparative metrics between two LLM outputs.
 */
async function computeMetrics(outputA, outputB, options) {
    const a = (0, diff_1.enrichOutput)(outputA);
    const b = (0, diff_1.enrichOutput)(outputB);
    // Token counts
    const tokens = {
        a: { input: a.tokens?.input, output: a.tokens?.output ?? 0 },
        b: { input: b.tokens?.input, output: b.tokens?.output ?? 0 },
    };
    // Cost
    const costA = estimateCost(a, options?.pricing);
    const costB = estimateCost(b, options?.pricing);
    let cost;
    if (costA !== undefined && costB !== undefined) {
        const delta = costB - costA;
        const deltaPercent = costA !== 0 ? (delta / costA) * 100 : (costB !== 0 ? 100 : 0);
        cost = { a: costA, b: costB, delta, deltaPercent };
    }
    // Latency
    let latency;
    if (a.latency !== undefined && b.latency !== undefined) {
        latency = {
            a: a.latency,
            b: b.latency,
            delta: b.latency - a.latency,
        };
    }
    // Similarity
    const jaccard = (0, similarity_1.jaccardSimilarity)(a.text, b.text);
    let semantic;
    if (options?.embedFn) {
        const [embA, embB] = await Promise.all([
            options.embedFn(a.text),
            options.embedFn(b.text),
        ]);
        semantic = (0, similarity_1.embeddingCosineSimilarity)(embA, embB);
    }
    // Length
    const lengthA = (0, similarity_1.computeLengthStats)(a.text);
    const lengthB = (0, similarity_1.computeLengthStats)(b.text);
    // Model
    const model = (a.model || b.model)
        ? { a: a.model, b: b.model }
        : undefined;
    return {
        tokens,
        cost,
        latency,
        similarity: { jaccard, semantic },
        length: { a: lengthA, b: lengthB },
        model,
    };
}
/**
 * Get the built-in pricing table (for testing and inspection).
 */
function getModelPricing() {
    const result = {};
    for (const [key, value] of Object.entries(MODEL_PRICING)) {
        result[key] = { ...value };
    }
    return result;
}
//# sourceMappingURL=metrics.js.map