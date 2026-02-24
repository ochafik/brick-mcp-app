import type { BrickDefinition } from './types.js';
export declare const BRICK_CATALOG: BrickDefinition[];
export declare function getBrickType(typeId: string): BrickDefinition | undefined;
export declare function getBrickTypesByCategory(category: BrickDefinition['category']): BrickDefinition[];
