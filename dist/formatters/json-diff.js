"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderJsonDiff = renderJsonDiff;
exports.renderJsonDiffFull = renderJsonDiffFull;
const colors_1 = require("./colors");
/**
 * Render a JSON diff with ANSI colors.
 */
function renderJsonDiff(changes, originalA, originalB, useColor = true) {
    if (changes.length === 0) {
        return (0, colors_1.colorize)('(no JSON differences)', colors_1.GREEN, useColor);
    }
    const lines = [];
    lines.push((0, colors_1.colorize)('JSON Diff:', colors_1.YELLOW, useColor));
    lines.push('');
    for (const change of changes) {
        const pathStr = change.path || '(root)';
        switch (change.type) {
            case 'added':
                lines.push((0, colors_1.colorize)(`+ ${pathStr}: ${formatJsonValue(change.after)}`, colors_1.GREEN, useColor));
                break;
            case 'removed':
                lines.push((0, colors_1.colorize)(`- ${pathStr}: ${formatJsonValue(change.before)}`, colors_1.RED, useColor));
                break;
            case 'changed':
                lines.push((0, colors_1.colorize)(`- ${pathStr}: ${formatJsonValue(change.before)}`, colors_1.RED, useColor));
                lines.push((0, colors_1.colorize)(`+ ${pathStr}: ${formatJsonValue(change.after)}`, colors_1.GREEN, useColor));
                break;
        }
    }
    return lines.join('\n');
}
/**
 * Format a JSON value for display.
 */
function formatJsonValue(value) {
    if (value === undefined)
        return 'undefined';
    return JSON.stringify(value);
}
/**
 * Render a full JSON diff showing both objects with annotations.
 */
function renderJsonDiffFull(jsonA, jsonB, changes, useColor = true) {
    const changedPaths = new Map();
    for (const change of changes) {
        changedPaths.set(change.path, change);
    }
    // Merge both objects and render with annotations
    const mergedLines = [];
    renderMerged(jsonA, jsonB, changes, '', mergedLines, useColor);
    return mergedLines.join('\n');
}
function renderMerged(a, b, changes, _path, lines, useColor, _indent = 0) {
    // Simple rendering: show changes list
    if (changes.length === 0) {
        lines.push(JSON.stringify(b, null, 2));
        return;
    }
    lines.push(renderJsonDiff(changes, a, b, useColor));
}
//# sourceMappingURL=json-diff.js.map