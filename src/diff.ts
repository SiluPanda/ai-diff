import { DiffSegment, DiffHunk, JsonChange, LLMOutput } from './types';

/**
 * Normalize input to LLMOutput.
 */
export function normalizeOutput(input: string | LLMOutput): LLMOutput {
  if (typeof input === 'string') {
    return { text: input };
  }
  return { ...input };
}

/**
 * Estimate output tokens from text using heuristic (chars / 4).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Enrich an LLMOutput with estimated fields where missing.
 */
export function enrichOutput(output: LLMOutput): LLMOutput {
  const enriched = { ...output };
  if (!enriched.tokens) {
    enriched.tokens = { output: estimateTokens(enriched.text) };
  } else {
    enriched.tokens = { ...enriched.tokens };
    if (enriched.tokens.output === undefined) {
      enriched.tokens.output = estimateTokens(enriched.text);
    }
  }
  return enriched;
}

// ── LCS-based diff algorithms ──

/**
 * Tokenize a string into words, preserving whitespace as separate tokens.
 */
export function tokenizeWords(text: string): string[] {
  const tokens: string[] = [];
  const regex = /(\S+|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

/**
 * Compute the Longest Common Subsequence table for two arrays.
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/**
 * Backtrack the LCS table to produce diff segments.
 */
function backtrackLCS(a: string[], b: string[], dp: number[][], joiner: string = ''): DiffSegment[] {
  const segments: DiffSegment[] = [];
  let i = a.length;
  let j = b.length;

  // Build segments in reverse, then reverse at end
  const reversed: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      reversed.push({ text: a[i - 1], type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ text: b[j - 1], type: 'added' });
      j--;
    } else {
      reversed.push({ text: a[i - 1], type: 'removed' });
      i--;
    }
  }

  reversed.reverse();

  // Merge consecutive segments of the same type
  for (const seg of reversed) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type) {
      segments[segments.length - 1].text += joiner + seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

/**
 * Compute word-level diff between two strings.
 * Returns an array of DiffSegments.
 */
export function diffWords(textA: string, textB: string): DiffSegment[] {
  if (textA === textB) {
    return textA ? [{ text: textA, type: 'unchanged' }] : [];
  }

  const tokensA = tokenizeWords(textA);
  const tokensB = tokenizeWords(textB);

  if (tokensA.length === 0 && tokensB.length === 0) return [];
  if (tokensA.length === 0) return [{ text: textB, type: 'added' }];
  if (tokensB.length === 0) return [{ text: textA, type: 'removed' }];

  const dp = lcsTable(tokensA, tokensB);
  return backtrackLCS(tokensA, tokensB, dp);
}

/**
 * Compute line-level diff between two strings.
 * Returns an array of DiffSegments where each segment is one or more lines.
 */
export function diffLines(textA: string, textB: string): DiffSegment[] {
  if (textA === textB) {
    return textA ? [{ text: textA, type: 'unchanged' }] : [];
  }

  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  if (linesA.length === 0 && linesB.length === 0) return [];

  const dp = lcsTable(linesA, linesB);
  const rawSegments = backtrackLCS(linesA, linesB, dp, '\n');

  return rawSegments;
}

/**
 * Compute diff hunks between two texts.
 * Each hunk is a contiguous group of changes with optional context lines.
 */
export function computeHunks(textA: string, textB: string, contextLines: number = 3): DiffHunk[] {
  if (textA === textB) return [];

  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  const dp = lcsTable(linesA, linesB);
  const lineSegments = backtrackLCS(linesA, linesB, dp, '\n');

  // Expand line segments into individual line entries with line numbers
  interface LineDiff {
    type: 'added' | 'removed' | 'unchanged';
    text: string;
    lineA: number; // line number in A (1-based), 0 if not applicable
    lineB: number; // line number in B (1-based), 0 if not applicable
  }

  const lineDiffs: LineDiff[] = [];
  let lineNumA = 1;
  let lineNumB = 1;

  for (const seg of lineSegments) {
    // Each segment's text may contain newlines (if it was merged from multiple lines)
    const segLines = seg.text.split('\n');
    for (const line of segLines) {
      if (seg.type === 'unchanged') {
        lineDiffs.push({ type: 'unchanged', text: line, lineA: lineNumA, lineB: lineNumB });
        lineNumA++;
        lineNumB++;
      } else if (seg.type === 'removed') {
        lineDiffs.push({ type: 'removed', text: line, lineA: lineNumA, lineB: 0 });
        lineNumA++;
      } else {
        lineDiffs.push({ type: 'added', text: line, lineA: 0, lineB: lineNumB });
        lineNumB++;
      }
    }
  }

  // Find changed ranges and build hunks with context
  const hunks: DiffHunk[] = [];
  const changeIndices: number[] = [];
  for (let i = 0; i < lineDiffs.length; i++) {
    if (lineDiffs[i].type !== 'unchanged') {
      changeIndices.push(i);
    }
  }

  if (changeIndices.length === 0) return [];

  // Group changes that are close together
  const groups: Array<{ start: number; end: number }> = [];
  let groupStart = changeIndices[0];
  let groupEnd = changeIndices[0];

  for (let i = 1; i < changeIndices.length; i++) {
    if (changeIndices[i] - groupEnd <= contextLines * 2 + 1) {
      groupEnd = changeIndices[i];
    } else {
      groups.push({ start: groupStart, end: groupEnd });
      groupStart = changeIndices[i];
      groupEnd = changeIndices[i];
    }
  }
  groups.push({ start: groupStart, end: groupEnd });

  // Build hunks with context
  for (const group of groups) {
    const start = Math.max(0, group.start - contextLines);
    const end = Math.min(lineDiffs.length - 1, group.end + contextLines);

    const segments: DiffSegment[] = [];
    let hunkLineA = 0;
    let hunkLineB = 0;

    for (let i = start; i <= end; i++) {
      const ld = lineDiffs[i];
      segments.push({ text: ld.text, type: ld.type });

      if (i === start) {
        hunkLineA = ld.lineA;
        hunkLineB = ld.lineB;
        // For added lines at the start, lineA is 0
        if (ld.type === 'added') {
          // Look backwards to find a valid lineA
          for (let j = i - 1; j >= 0; j--) {
            if (lineDiffs[j].lineA > 0) {
              hunkLineA = lineDiffs[j].lineA + 1;
              break;
            }
          }
          if (hunkLineA === 0) hunkLineA = 1;
        }
        if (ld.type === 'removed') {
          // Look backwards to find a valid lineB
          for (let j = i - 1; j >= 0; j--) {
            if (lineDiffs[j].lineB > 0) {
              hunkLineB = lineDiffs[j].lineB + 1;
              break;
            }
          }
          if (hunkLineB === 0) hunkLineB = 1;
        }
      }
    }

    hunks.push({
      lineA: hunkLineA || 1,
      lineB: hunkLineB || 1,
      segments,
    });
  }

  return hunks;
}

/**
 * Compute JSON structural diff between two values.
 */
export function diffJson(a: unknown, b: unknown, path: string = ''): JsonChange[] {
  const changes: JsonChange[] = [];

  if (a === b) return changes;

  // Both are arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= a.length) {
        changes.push({ path: itemPath, type: 'added', after: b[i] });
      } else if (i >= b.length) {
        changes.push({ path: itemPath, type: 'removed', before: a[i] });
      } else if (a[i] !== b[i]) {
        if (typeof a[i] === 'object' && typeof b[i] === 'object' && a[i] !== null && b[i] !== null) {
          changes.push(...diffJson(a[i], b[i], itemPath));
        } else {
          changes.push({ path: itemPath, type: 'changed', before: a[i], after: b[i] });
        }
      }
    }
    return changes;
  }

  // Both are objects (but not arrays)
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null && !Array.isArray(a) && !Array.isArray(b)) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      if (!(key in objA)) {
        changes.push({ path: keyPath, type: 'added', after: objB[key] });
      } else if (!(key in objB)) {
        changes.push({ path: keyPath, type: 'removed', before: objA[key] });
      } else if (typeof objA[key] === 'object' && typeof objB[key] === 'object' && objA[key] !== null && objB[key] !== null) {
        changes.push(...diffJson(objA[key], objB[key], keyPath));
      } else if (objA[key] !== objB[key]) {
        changes.push({ path: keyPath, type: 'changed', before: objA[key], after: objB[key] });
      }
    }
    return changes;
  }

  // Primitive values that differ
  changes.push({
    path: path || '',
    type: 'changed',
    before: a,
    after: b,
  });

  return changes;
}

/**
 * Try to parse a string as JSON. Returns the parsed value or null.
 */
export function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
