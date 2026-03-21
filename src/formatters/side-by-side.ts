import { DiffResult } from '../types';
import { colorize, RED, GREEN, CYAN, DIM, RESET } from './colors';

/**
 * Wrap text to fit within a specified width.
 */
function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > width) {
    // Find last space within width
    let breakAt = remaining.lastIndexOf(' ', width);
    if (breakAt <= 0) breakAt = width;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0 || lines.length === 0) {
    lines.push(remaining);
  }

  return lines;
}

/**
 * Render a side-by-side diff with two columns.
 */
export function renderSideBySide(result: DiffResult, useColor: boolean = true, width?: number): string {
  const termWidth = width || 80;
  const colWidth = Math.floor((termWidth - 3) / 2); // 3 for separator ' | '

  const labelA = result.outputA.model || 'Output A';
  const labelB = result.outputB.model || 'Output B';

  const lines: string[] = [];

  // Header
  const headerA = labelA.padEnd(colWidth);
  const headerB = labelB.padEnd(colWidth);
  lines.push(
    colorize(headerA, CYAN, useColor) +
    (useColor ? `${DIM} | ${RESET}` : ' | ') +
    colorize(headerB, CYAN, useColor),
  );

  // Separator
  const sep = '─'.repeat(colWidth) + (useColor ? `${DIM}─┼─${RESET}` : '-+-') + '─'.repeat(colWidth);
  lines.push(useColor ? `${DIM}${sep}${RESET}` : sep);

  if (result.identical) {
    const wrappedA = wrapText(result.outputA.text, colWidth);
    for (const line of wrappedA) {
      lines.push(line.padEnd(colWidth) + (useColor ? `${DIM} | ${RESET}` : ' | ') + line);
    }
    return lines.join('\n');
  }

  // Build aligned lines from hunks
  const linesA = result.outputA.text.split('\n');
  const linesB = result.outputB.text.split('\n');

  // Use diff hunks to align lines
  const maxLines = Math.max(linesA.length, linesB.length);

  // Simple approach: use the line-level segments from hunks
  const alignedPairs: Array<{ left: string; right: string; changed: boolean }> = [];

  // Walk through hunk segments to build aligned pairs
  let idxA = 0;
  let idxB = 0;

  for (const hunk of result.hunks) {
    // Add unchanged lines before hunk
    while (idxA < hunk.lineA - 1 && idxB < hunk.lineB - 1) {
      alignedPairs.push({
        left: linesA[idxA] || '',
        right: linesB[idxB] || '',
        changed: false,
      });
      idxA++;
      idxB++;
    }

    // Process hunk segments
    const removed: string[] = [];
    const added: string[] = [];
    const unchanged: string[] = [];

    for (const seg of hunk.segments) {
      if (seg.type === 'removed') {
        removed.push(seg.text);
      } else if (seg.type === 'added') {
        added.push(seg.text);
      } else {
        // Flush any pending removed/added
        const pairLen = Math.max(removed.length, added.length);
        for (let i = 0; i < pairLen; i++) {
          alignedPairs.push({
            left: i < removed.length ? removed[i] : '',
            right: i < added.length ? added[i] : '',
            changed: true,
          });
        }
        removed.length = 0;
        added.length = 0;

        alignedPairs.push({ left: seg.text, right: seg.text, changed: false });
        unchanged.push(seg.text);
      }
    }

    // Flush remaining
    const pairLen = Math.max(removed.length, added.length);
    for (let i = 0; i < pairLen; i++) {
      alignedPairs.push({
        left: i < removed.length ? removed[i] : '',
        right: i < added.length ? added[i] : '',
        changed: true,
      });
    }

    // Update indices
    idxA = hunk.lineA - 1 + hunk.segments.filter(s => s.type !== 'added').length;
    idxB = hunk.lineB - 1 + hunk.segments.filter(s => s.type !== 'removed').length;
  }

  // Add any remaining lines after last hunk
  while (idxA < linesA.length || idxB < linesB.length) {
    alignedPairs.push({
      left: idxA < linesA.length ? linesA[idxA] : '',
      right: idxB < linesB.length ? linesB[idxB] : '',
      changed: false,
    });
    idxA++;
    idxB++;
  }

  // If no hunks were generated, fall back to simple side-by-side
  if (alignedPairs.length === 0) {
    for (let i = 0; i < maxLines; i++) {
      const left = (i < linesA.length ? linesA[i] : '').padEnd(colWidth).slice(0, colWidth);
      const right = (i < linesB.length ? linesB[i] : '').padEnd(colWidth).slice(0, colWidth);
      lines.push(left + (useColor ? `${DIM} | ${RESET}` : ' | ') + right);
    }
  } else {
    for (const pair of alignedPairs) {
      const wrappedLeft = wrapText(pair.left, colWidth);
      const wrappedRight = wrapText(pair.right, colWidth);
      const maxWrapped = Math.max(wrappedLeft.length, wrappedRight.length);

      for (let i = 0; i < maxWrapped; i++) {
        let left = (i < wrappedLeft.length ? wrappedLeft[i] : '').padEnd(colWidth);
        let right = (i < wrappedRight.length ? wrappedRight[i] : '').padEnd(colWidth);

        if (pair.changed && useColor) {
          if (pair.left) left = `${RED}${left}${RESET}`;
          if (pair.right) right = `${GREEN}${right}${RESET}`;
        }

        lines.push(left + (useColor ? `${DIM} | ${RESET}` : ' | ') + right);
      }
    }
  }

  return lines.join('\n');
}
