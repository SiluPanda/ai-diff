import { DiffResult, DiffSegment } from '../types';
import { colorize, RED, GREEN, RESET, BOLD_INVERSE } from './colors';
import { diffWords } from '../diff';

/**
 * Render a unified diff with ANSI colors.
 * Shows removed lines in red, added lines in green, with word-level highlighting.
 */
export function renderUnifiedDiff(result: DiffResult, useColor: boolean = true): string {
  if (result.identical) {
    return colorize('(no differences)', GREEN, useColor);
  }

  const lines: string[] = [];
  const labelA = result.outputA.model || 'Output A';
  const labelB = result.outputB.model || 'Output B';

  // Header
  lines.push(colorize(`--- ${labelA}`, RED, useColor));
  lines.push(colorize(`+++ ${labelB}`, GREEN, useColor));

  for (const hunk of result.hunks) {
    // Hunk header
    lines.push(colorize(`@@ -${hunk.lineA} +${hunk.lineB} @@`, '\x1b[36m', useColor));

    // Group consecutive removed/added segments for word-level highlighting
    let i = 0;
    while (i < hunk.segments.length) {
      const seg = hunk.segments[i];

      if (seg.type === 'unchanged') {
        lines.push(`  ${seg.text}`);
        i++;
      } else if (seg.type === 'removed') {
        // Look ahead for a paired 'added' segment for word-level diff
        const removedSegs: DiffSegment[] = [seg];
        let j = i + 1;
        while (j < hunk.segments.length && hunk.segments[j].type === 'removed') {
          removedSegs.push(hunk.segments[j]);
          j++;
        }
        const addedSegs: DiffSegment[] = [];
        while (j < hunk.segments.length && hunk.segments[j].type === 'added') {
          addedSegs.push(hunk.segments[j]);
          j++;
        }

        if (addedSegs.length > 0) {
          // We have paired removed/added - do word-level diff within them
          const removedText = removedSegs.map(s => s.text).join('\n');
          const addedText = addedSegs.map(s => s.text).join('\n');
          const wordDiff = diffWords(removedText, addedText);

          // Render removed line with word highlights
          let removedLine = '';
          let addedLine = '';
          for (const wd of wordDiff) {
            if (wd.type === 'unchanged') {
              removedLine += wd.text;
              addedLine += wd.text;
            } else if (wd.type === 'removed') {
              if (useColor) {
                removedLine += `${BOLD_INVERSE}${wd.text}${RESET}${RED}`;
              } else {
                removedLine += `[${wd.text}]`;
              }
            } else {
              if (useColor) {
                addedLine += `${BOLD_INVERSE}${wd.text}${RESET}${GREEN}`;
              } else {
                addedLine += `[${wd.text}]`;
              }
            }
          }

          for (const rl of removedLine.split('\n')) {
            lines.push(colorize(`- ${rl}`, RED, useColor));
          }
          for (const al of addedLine.split('\n')) {
            lines.push(colorize(`+ ${al}`, GREEN, useColor));
          }
        } else {
          // Just removed, no paired added
          for (const rs of removedSegs) {
            for (const rl of rs.text.split('\n')) {
              lines.push(colorize(`- ${rl}`, RED, useColor));
            }
          }
        }

        i = j;
      } else {
        // added without paired removed
        for (const al of seg.text.split('\n')) {
          lines.push(colorize(`+ ${al}`, GREEN, useColor));
        }
        i++;
      }
    }
  }

  return lines.join('\n');
}
