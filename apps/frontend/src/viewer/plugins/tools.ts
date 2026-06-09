import type { MoleculeDocument } from '../../shared/types';

export interface SelectAtomTool {
  select(document: MoleculeDocument, atomIndex: number): void;
}

export interface MoveAtomTool {
  move(document: MoleculeDocument, atomIndex: number, x: number, y: number, z: number): void;
}

export interface MeasureDistanceTool {
  measure(document: MoleculeDocument, atomIndexA: number, atomIndexB: number): number;
}

export interface SetDihedralTool {
  setDihedral(
    document: MoleculeDocument,
    atomIndexA: number,
    atomIndexB: number,
    atomIndexC: number,
    atomIndexD: number,
    angleDegrees: number,
  ): void;
}
