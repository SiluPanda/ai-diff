"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderUnifiedDiff = renderUnifiedDiff;
const colors_1 = require("./colors");
const diff_1 = require("../diff");
/**
 * Render a unified diff with ANSI colors.
 * Shows removed lines in red, added lines in green, with word-level highlighting.
 */
function renderUnifiedDiff(result, useColor = true) {
    if (result.identical) {
        return (0, colors_1.colorize)('(no differences)', colors_1.GREEN, useColor);
    }
    const lines = [];
    const labelA = result.outputA.model || 'Output A';
    const labelB = result.outputB.model || 'Output B';
    // Header
    lines.push((0, colors_1.colorize)(`--- ${labelA}`, colors_1.RED, useColor));
    lines.push((0, colors_1.colorize)(`+++ ${labelB}`, colors_1.GREEN, useColor));
    for (const hunk of result.hunks) {
        // Hunk header
        lines.push((0, colors_1.colorize)(`@@ -${hunk.lineA} +${hunk.lineB} @@`, '\x1b[36m', useColor));
        // Group consecutive removed/added segments for word-level highlighting
        let i = 0;
        while (i < hunk.segments.length) {
            const seg = hunk.segments[i];
            if (seg.type === 'unchanged') {
                lines.push(`  ${seg.text}`);
                i++;
            }
            else if (seg.type === 'removed') {
                // Look ahead for a paired 'added' segment for word-level diff
                const removedSegs = [seg];
                let j = i + 1;
                while (j < hunk.segments.length && hunk.segments[j].type === 'removed') {
                    removedSegs.push(hunk.segments[j]);
                    j++;
                }
                const addedSegs = [];
                while (j < hunk.segments.length && hunk.segments[j].type === 'added') {
                    addedSegs.push(hunk.segments[j]);
                    j++;
                }
                if (addedSegs.length > 0) {
                    // We have paired removed/added - do word-level diff within them
                    const removedText = removedSegs.map(s => s.text).join('\n');
                    const addedText = addedSegs.map(s => s.text).join('\n');
                    const wordDiff = (0, diff_1.diffWords)(removedText, addedText);
                    // Render removed line with word highlights
                    let removedLine = '';
                    let addedLine = '';
                    for (const wd of wordDiff) {
                        if (wd.type === 'unchanged') {
                            removedLine += wd.text;
                            addedLine += wd.text;
                        }
                        else if (wd.type === 'removed') {
                            if (useColor) {
                                removedLine += `${colors_1.BOLD_INVERSE}${wd.text}${colors_1.RESET}${colors_1.RED}`;
                            }
                            else {
                                removedLine += `[${wd.text}]`;
                            }
                        }
                        else {
                            if (useColor) {
                                addedLine += `${colors_1.BOLD_INVERSE}${wd.text}${colors_1.RESET}${colors_1.GREEN}`;
                            }
                            else {
                                addedLine += `[${wd.text}]`;
                            }
                        }
                    }
                    for (const rl of removedLine.split('\n')) {
                        lines.push((0, colors_1.colorize)(`- ${rl}`, colors_1.RED, useColor));
                    }
                    for (const al of addedLine.split('\n')) {
                        lines.push((0, colors_1.colorize)(`+ ${al}`, colors_1.GREEN, useColor));
                    }
                }
                else {
                    // Just removed, no paired added
                    for (const rs of removedSegs) {
                        for (const rl of rs.text.split('\n')) {
                            lines.push((0, colors_1.colorize)(`- ${rl}`, colors_1.RED, useColor));
                        }
                    }
                }
                i = j;
            }
            else {
                // added without paired removed
                for (const al of seg.text.split('\n')) {
                    lines.push((0, colors_1.colorize)(`+ ${al}`, colors_1.GREEN, useColor));
                }
                i++;
            }
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=unified.js.map