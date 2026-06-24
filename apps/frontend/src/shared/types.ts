export interface Atom {
  index: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export type MoleculeDocumentKind = 'structure';
export type TrajectoryDocumentKind = 'trajectory';
export type DocumentKind = MoleculeDocumentKind | TrajectoryDocumentKind;
export type JsonScalar = string | number | boolean | null;

export interface DocumentSource {
  path: string;
  filename: string;
  filetype: string;
}

export type CalculationProgram = 'gaussian' | 'orca';

export interface CalculationMetadata {
  program: CalculationProgram;
  normal_termination: boolean;
}

export interface MoleculeDocument {
  id: string;
  name: string;
  document_kind: MoleculeDocumentKind;
  source: DocumentSource | null;
  calculation: CalculationMetadata | null;
  coordinate_unit: 'angstrom';
  charge: number | null;
  multiplicity: number | null;
  atoms: Atom[];
  bonds: Bond[];
}

export interface TrajectoryDocument {
  id: string;
  name: string;
  document_kind: TrajectoryDocumentKind;
  source: DocumentSource | null;
  calculation: CalculationMetadata | null;
  coordinate_unit: 'angstrom';
  frames: MoleculeDocument[];
  frame_properties: Array<Record<string, JsonScalar>>;
}

export interface OpenDocumentRequest {
  path?: string;
  document_id?: string;
}
