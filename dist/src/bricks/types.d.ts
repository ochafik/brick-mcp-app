export interface BlockoutZone {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    height: number;
}
export interface BrickDefinition {
    id: string;
    name: string;
    category: 'brick' | 'plate' | 'slope' | 'technic' | 'corner';
    studsX: number;
    studsZ: number;
    heightUnits: number;
    blockout?: BlockoutZone[];
}
