import { DiffSegment } from '../types';
import { RED, GREEN, RESET, STRIKETHROUGH, UNDERLINE } from './colors';

/**
 * Render an inline diff with ANSI colors.
 * Removed text is shown in red with strikethrough.
 * Added text is shown in green with underline.
 * Unchanged text is in default color.
 */
export function renderInlineDiff(segments: DiffSegment[], useColor: boolean = true): string {
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.type === 'unchanged') {
      parts.push(seg.text);
    } else if (seg.type === 'removed') {
      if (useColor) {
        parts.push(`${RED}${STRIKETHROUGH}${seg.text}${RESET}`);
      } else {
        parts.push(`~~${seg.text}~~`);
      }
    } else {
      if (useColor) {
        parts.push(`${GREEN}${UNDERLINE}${seg.text}${RESET}`);
      } else {
        parts.push(`__${seg.text}__`);
      }
    }
  }

  return parts.join('');
}
