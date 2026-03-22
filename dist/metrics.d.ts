import { LLMOutput, DiffMetrics } from './types';
/**
 * Estimate cost for an LLM output based on model and token counts.
 */
export declare function estimateCost(output: LLMOutput, pricingOverrides?: Record<string, {
    input: number;
    output: number;
}>): number | undefined;
/**
 * Compute comparative metrics between two LLM outputs.
 */
export declare function computeMetrics(outputA: LLMOutput, outputB: LLMOutput, options?: {
    embedFn?: (_text: string) => Promise<number[]>;
    pricing?: Record<string, {
        input: number;
        output: number;
    }>;
}): Promise<DiffMetrics>;
/**
 * Get the built-in pricing table (for testing and inspection).
 */
export declare function getModelPricing(): Record<string, {
    input: number;
    output: number;
}>;
//# sourceMappingURL=metrics.d.ts.map