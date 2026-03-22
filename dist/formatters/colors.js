"use strict";
/** ANSI color codes for terminal output. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNDERLINE = exports.STRIKETHROUGH = exports.BOLD_INVERSE = exports.BOLD = exports.DIM = exports.CYAN = exports.YELLOW = exports.GREEN = exports.RED = exports.RESET = void 0;
exports.colorize = colorize;
exports.shouldUseColor = shouldUseColor;
exports.RESET = '\x1b[0m';
exports.RED = '\x1b[31m';
exports.GREEN = '\x1b[32m';
exports.YELLOW = '\x1b[33m';
exports.CYAN = '\x1b[36m';
exports.DIM = '\x1b[2m';
exports.BOLD = '\x1b[1m';
exports.BOLD_INVERSE = '\x1b[1;7m';
exports.STRIKETHROUGH = '\x1b[9m';
exports.UNDERLINE = '\x1b[4m';
/**
 * Wrap text in ANSI color codes.
 * Returns plain text if color is disabled.
 */
function colorize(text, color, useColor = true) {
    if (!useColor)
        return text;
    return `${color}${text}${exports.RESET}`;
}
/**
 * Detect whether to use colors based on environment.
 */
function shouldUseColor(override) {
    if (override !== undefined)
        return override;
    if (process.env['NO_COLOR'] !== undefined)
        return false;
    if (typeof process.stdout?.isTTY === 'boolean')
        return process.stdout.isTTY;
    return false;
}
//# sourceMappingURL=colors.js.map