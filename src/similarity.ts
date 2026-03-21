import { LengthStats } from './types';

/**
 * Tokenize text into a normalized word set for similarity computation.
 * Lowercases and removes punctuation.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Compute Jaccard similarity between two texts.
 * |A intersection B| / |A union B|
 * Returns a value between 0.0 and 1.0.
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(tokenize(textA));
  const wordsB = new Set(tokenize(textB));

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersection++;
    }
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * Build a word frequency vector from text.
 */
function wordFrequency(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of tokenize(text)) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

/**
 * Compute cosine similarity between two texts using word frequency vectors.
 * Returns a value between 0.0 and 1.0.
 */
export function cosineSimilarity(textA: string, textB: string): number {
  const freqA = wordFrequency(textA);
  const freqB = wordFrequency(textB);

  if (freqA.size === 0 && freqB.size === 0) return 1.0;
  if (freqA.size === 0 || freqB.size === 0) return 0.0;

  const allWords = new Set([...freqA.keys(), ...freqB.keys()]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of allWords) {
    const a = freqA.get(word) || 0;
    const b = freqB.get(word) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

/**
 * Compute exact match ratio between two texts.
 * Returns 1.0 if texts are identical, 0.0 otherwise.
 */
export function exactMatchRatio(textA: string, textB: string): number {
  return textA === textB ? 1.0 : 0.0;
}

/**
 * Compute an overall composite similarity score.
 * Weighted average: Jaccard (0.5) + Cosine (0.3) + Exact (0.2)
 */
export function compositeSimilarity(textA: string, textB: string): number {
  const jaccard = jaccardSimilarity(textA, textB);
  const cosine = cosineSimilarity(textA, textB);
  const exact = exactMatchRatio(textA, textB);
  return jaccard * 0.5 + cosine * 0.3 + exact * 0.2;
}

/**
 * Compute cosine similarity between two embedding vectors.
 */
export function embeddingCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding vectors must have the same length: ${a.length} vs ${b.length}`);
  }
  if (a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

/**
 * Compute length statistics for a text.
 */
export function computeLengthStats(text: string): LengthStats {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  // Sentences: split by terminal punctuation followed by whitespace or end of string
  const sentenceMatches = text.match(/[.!?](\s|$)/g);
  const sentences = sentenceMatches ? sentenceMatches.length : (text.trim().length > 0 ? 1 : 0);
  const characters = text.length;

  return { words, sentences, characters };
}
