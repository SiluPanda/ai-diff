import { DiffMetrics } from '../types';
/**
 * Format a number with comma separators.
 */
export declare function formatNumber(n: number): string;
/**
 * Format a cost value in USD.
 */
export declare function formatCost(n: number): string;
/**
 * Format a delta value with sign and optional percentage.
 */
export declare function formatDelta(delta: number, percent?: number): string;
/**
 * Format a cost delta.
 */
export declare function formatCostDelta(delta: number): string;
/**
 * Render a metrics comparison table as a formatted string.
 */
export declare function renderMetricsTable(metrics: DiffMetrics, labelA: string, labelB: string, useColor?: boolean): string;
//# sourceMappingURL=metrics-table.d.ts.map