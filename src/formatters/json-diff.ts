import { JsonChange } from '../types';
import { colorize, RED, GREEN, YELLOW } from './colors';

/**
 * Render a JSON diff with ANSI colors.
 */
export function renderJsonDiff(
  changes: JsonChange[],
  originalA: unknown,
  originalB: unknown,
  useColor: boolean = true,
): string {
  if (changes.length === 0) {
    return colorize('(no JSON differences)', GREEN, useColor);
  }

  const lines: string[] = [];

  lines.push(colorize('JSON Diff:', YELLOW, useColor));
  lines.push('');

  for (const change of changes) {
    const pathStr = change.path || '(root)';

    switch (change.type) {
      case 'added':
        lines.push(colorize(`+ ${pathStr}: ${formatJsonValue(change.after)}`, GREEN, useColor));
        break;
      case 'removed':
        lines.push(colorize(`- ${pathStr}: ${formatJsonValue(change.before)}`, RED, useColor));
        break;
      case 'changed':
        lines.push(colorize(`- ${pathStr}: ${formatJsonValue(change.before)}`, RED, useColor));
        lines.push(colorize(`+ ${pathStr}: ${formatJsonValue(change.after)}`, GREEN, useColor));
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Format a JSON value for display.
 */
function formatJsonValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}

/**
 * Render a full JSON diff showing both objects with annotations.
 */
export function renderJsonDiffFull(
  jsonA: unknown,
  jsonB: unknown,
  changes: JsonChange[],
  useColor: boolean = true,
): string {
  const changedPaths = new Map<string, JsonChange>();
  for (const change of changes) {
    changedPaths.set(change.path, change);
  }

  // Merge both objects and render with annotations
  const mergedLines: string[] = [];
  renderMerged(jsonA, jsonB, changes, '', mergedLines, useColor);
  return mergedLines.join('\n');
}

function renderMerged(
  a: unknown,
  b: unknown,
  changes: JsonChange[],
  _path: string,
  lines: string[],
  useColor: boolean,
  _indent: number = 0,
): void {
  // Simple rendering: show changes list
  if (changes.length === 0) {
    lines.push(JSON.stringify(b, null, 2));
    return;
  }

  lines.push(renderJsonDiff(changes, a, b, useColor));
}
