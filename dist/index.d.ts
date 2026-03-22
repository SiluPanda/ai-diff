import { LLMOutput, LLMFn, DiffMode, DiffOptions, CompareOptions, OutputFormat, DiffResult, MultiDiffResult, ComparisonResult, DiffSegment, DiffHunk, DiffMetrics, LengthStats, JsonChange } from './types';
import { normalizeOutput, enrichOutput, estimateTokens, computeHunks, diffWords as computeWordDiff, diffLines as computeLineDiff, diffJson as computeJsonDiff, tryParseJson, tokenizeWords } from './diff';
import { jaccardSimilarity, cosineSimilarity, exactMatchRatio, compositeSimilarity, embeddingCosineSimilarity, computeLengthStats } from './similarity';
import { computeMetrics, estimateCost, getModelPricing } from './metrics';
import { renderMetricsTable, renderUnifiedDiff, renderInlineDiff, renderSideBySide, renderJsonDiff, shouldUseColor } from './formatters';
/**
 * Compare two LLM outputs and return a DiffResult.
 */
export declare function diff(outputA: string | LLMOutput, outputB: string | LLMOutput, options?: DiffOptions): DiffResult;
/**
 * Compare N LLM outputs pairwise.
 */
export declare function diffOutputs(outputs: (string | LLMOutput)[], options?: DiffOptions): MultiDiffResult;
/**
 * Send a prompt to multiple models and compare the outputs.
 */
export declare function compare(prompt: string, models: string[], llmFn: LLMFn, options?: CompareOptions): Promise<ComparisonResult>;
/**
 * Format a diff result into a displayable string.
 */
export declare function formatDiff(result: DiffResult | MultiDiffResult | ComparisonResult, format?: OutputFormat): string;
export type { LLMOutput, LLMFn, DiffMode, DiffOptions, CompareOptions, OutputFormat, DiffResult, MultiDiffResult, ComparisonResult, DiffSegment, DiffHunk, DiffMetrics, LengthStats, JsonChange, };
export { normalizeOutput, enrichOutput, estimateTokens, computeHunks, tokenizeWords, tryParseJson, };
export { computeWordDiff as diffWords };
export { computeLineDiff as diffLines };
export { computeJsonDiff as diffJson };
export { jaccardSimilarity, cosineSimilarity, exactMatchRatio, compositeSimilarity, embeddingCosineSimilarity, computeLengthStats, };
export { computeMetrics, estimateCost, getModelPricing };
export { renderMetricsTable, renderUnifiedDiff, renderInlineDiff, renderSideBySide, renderJsonDiff, shouldUseColor, };
//# sourceMappingURL=index.d.ts.map