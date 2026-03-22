import { DiffSegment, DiffHunk, JsonChange, LLMOutput } from './types';
/**
 * Normalize input to LLMOutput.
 */
export declare function normalizeOutput(input: string | LLMOutput): LLMOutput;
/**
 * Estimate output tokens from text using heuristic (chars / 4).
 */
export declare function estimateTokens(text: string): number;
/**
 * Enrich an LLMOutput with estimated fields where missing.
 */
export declare function enrichOutput(output: LLMOutput): LLMOutput;
/**
 * Tokenize a string into words, preserving whitespace as separate tokens.
 */
export declare function tokenizeWords(text: string): string[];
/**
 * Compute word-level diff between two strings.
 * Returns an array of DiffSegments.
 */
export declare function diffWords(textA: string, textB: string): DiffSegment[];
/**
 * Compute line-level diff between two strings.
 * Returns an array of DiffSegments where each segment is one or more lines.
 */
export declare function diffLines(textA: string, textB: string): DiffSegment[];
/**
 * Compute diff hunks between two texts.
 * Each hunk is a contiguous group of changes with optional context lines.
 */
export declare function computeHunks(textA: string, textB: string, contextLines?: number): DiffHunk[];
/**
 * Compute JSON structural diff between two values.
 */
export declare function diffJson(a: unknown, b: unknown, path?: string): JsonChange[];
/**
 * Try to parse a string as JSON. Returns the parsed value or null.
 */
export declare function tryParseJson(text: string): unknown | null;
//# sourceMappingURL=diff.d.ts.map