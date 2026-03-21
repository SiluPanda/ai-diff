/** ANSI color codes for terminal output. */

export const RESET = '\x1b[0m';
export const RED = '\x1b[31m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const CYAN = '\x1b[36m';
export const DIM = '\x1b[2m';
export const BOLD = '\x1b[1m';
export const BOLD_INVERSE = '\x1b[1;7m';
export const STRIKETHROUGH = '\x1b[9m';
export const UNDERLINE = '\x1b[4m';

/**
 * Wrap text in ANSI color codes.
 * Returns plain text if color is disabled.
 */
export function colorize(text: string, color: string, useColor: boolean = true): string {
  if (!useColor) return text;
  return `${color}${text}${RESET}`;
}

/**
 * Detect whether to use colors based on environment.
 */
export function shouldUseColor(override?: boolean): boolean {
  if (override !== undefined) return override;
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (typeof process.stdout?.isTTY === 'boolean') return process.stdout.isTTY;
  return false;
}
