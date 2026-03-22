import { LengthStats } from './types';
/**
 * Tokenize text into a normalized word set for similarity computation.
 * Lowercases and removes punctuation.
 */
export declare function tokenize(text: string): string[];
/**
 * Compute Jaccard similarity between two texts.
 * |A intersection B| / |A union B|
 * Returns a value between 0.0 and 1.0.
 */
export declare function jaccardSimilarity(textA: string, textB: string): number;
/**
 * Compute cosine similarity between two texts using word frequency vectors.
 * Returns a value between 0.0 and 1.0.
 */
export declare function cosineSimilarity(textA: string, textB: string): number;
/**
 * Compute exact match ratio between two texts.
 * Returns 1.0 if texts are identical, 0.0 otherwise.
 */
export declare function exactMatchRatio(textA: string, textB: string): number;
/**
 * Compute an overall composite similarity score.
 * Weighted average: Jaccard (0.5) + Cosine (0.3) + Exact (0.2)
 */
export declare function compositeSimilarity(textA: string, textB: string): number;
/**
 * Compute cosine similarity between two embedding vectors.
 */
export declare function embeddingCosineSimilarity(a: number[], b: number[]): number;
/**
 * Compute length statistics for a text.
 */
export declare function computeLengthStats(text: string): LengthStats;
//# sourceMappingURL=similarity.d.ts.map