import { JsonChange } from '../types';
/**
 * Render a JSON diff with ANSI colors.
 */
export declare function renderJsonDiff(changes: JsonChange[], originalA: unknown, originalB: unknown, useColor?: boolean): string;
/**
 * Render a full JSON diff showing both objects with annotations.
 */
export declare function renderJsonDiffFull(jsonA: unknown, jsonB: unknown, changes: JsonChange[], useColor?: boolean): string;
//# sourceMappingURL=json-diff.d.ts.map