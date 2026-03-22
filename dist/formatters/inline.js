"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInlineDiff = renderInlineDiff;
const colors_1 = require("./colors");
/**
 * Render an inline diff with ANSI colors.
 * Removed text is shown in red with strikethrough.
 * Added text is shown in green with underline.
 * Unchanged text is in default color.
 */
function renderInlineDiff(segments, useColor = true) {
    const parts = [];
    for (const seg of segments) {
        if (seg.type === 'unchanged') {
            parts.push(seg.text);
        }
        else if (seg.type === 'removed') {
            if (useColor) {
                parts.push(`${colors_1.RED}${colors_1.STRIKETHROUGH}${seg.text}${colors_1.RESET}`);
            }
            else {
                parts.push(`~~${seg.text}~~`);
            }
        }
        else {
            if (useColor) {
                parts.push(`${colors_1.GREEN}${colors_1.UNDERLINE}${seg.text}${colors_1.RESET}`);
            }
            else {
                parts.push(`__${seg.text}__`);
            }
        }
    }
    return parts.join('');
}
//# sourceMappingURL=inline.js.map