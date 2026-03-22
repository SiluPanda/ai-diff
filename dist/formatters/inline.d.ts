import { DiffSegment } from '../types';
/**
 * Render an inline diff with ANSI colors.
 * Removed text is shown in red with strikethrough.
 * Added text is shown in green with underline.
 * Unchanged text is in default color.
 */
export declare function renderInlineDiff(segments: DiffSegment[], useColor?: boolean): string;
//# sourceMappingURL=inline.d.ts.map