/** ANSI color codes for terminal output. */
export declare const RESET = "\u001B[0m";
export declare const RED = "\u001B[31m";
export declare const GREEN = "\u001B[32m";
export declare const YELLOW = "\u001B[33m";
export declare const CYAN = "\u001B[36m";
export declare const DIM = "\u001B[2m";
export declare const BOLD = "\u001B[1m";
export declare const BOLD_INVERSE = "\u001B[1;7m";
export declare const STRIKETHROUGH = "\u001B[9m";
export declare const UNDERLINE = "\u001B[4m";
/**
 * Wrap text in ANSI color codes.
 * Returns plain text if color is disabled.
 */
export declare function colorize(text: string, color: string, useColor?: boolean): string;
/**
 * Detect whether to use colors based on environment.
 */
export declare function shouldUseColor(override?: boolean): boolean;
//# sourceMappingURL=colors.d.ts.map