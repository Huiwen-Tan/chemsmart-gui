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

export interface CartesianPosition {
  x: number;
  y: number;
  z: number;
}

export type MoleculeDocumentKind = 'structure';
export type TrajectoryDocumentKind = 'trajectory';
export type CalculationResultDocumentKind = 'calculation_result';
export type DocumentKind =
  | MoleculeDocumentKind
  | TrajectoryDocumentKind
  | CalculationResultDocumentKind;
export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

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

export interface CalculationResultDocument {
  id: string;
  name: string;
  document_kind: CalculationResultDocumentKind;
  source: DocumentSource | null;
  calculation: CalculationMetadata | null;
  record_id: string;
  meta: Record<string, JsonValue>;
  results: Record<string, JsonValue>;
  molecules: MoleculeDocument[];
  provenance: Record<string, JsonValue>;
}

export type MoleculeEditCommandType = 'set_atom_position';

export interface SetAtomPositionCommand {
  command_type: 'set_atom_position';
  document_id: string;
  atom_index: number;
  position: CartesianPosition;
  coordinate_unit: 'angstrom';
}

export type MoleculeEditCommand = SetAtomPositionCommand;

export interface ApplyMoleculeEditRequest {
  document: MoleculeDocument;
  command: MoleculeEditCommand;
}

export interface MoleculeEditResponse {
  document: MoleculeDocument;
  can_undo: boolean;
  can_redo: boolean;
}

export type MoleculeExportPreviewFiletype = 'xyz' | 'gjf' | 'inp';

export interface MoleculeExportPreviewRequest {
  document: MoleculeDocument;
  filetype: MoleculeExportPreviewFiletype;
}

export interface MoleculeExportPreviewResponse {
  filename: string;
  filetype: MoleculeExportPreviewFiletype;
  content: string;
}

export interface OpenDocumentRequest {
  path?: string;
  document_id?: string;
}
