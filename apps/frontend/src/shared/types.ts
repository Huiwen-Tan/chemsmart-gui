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

export interface VibrationalDisplacement {
  atom_index: number;
  x: number;
  y: number;
  z: number;
}

export interface VibrationalMode {
  index: number;
  frequency_cm_minus_1: number;
  is_imaginary: boolean;
  reduced_mass_amu: number | null;
  force_constant_mdyne_per_angstrom: number | null;
  ir_intensity_km_per_mol: number | null;
  symmetry: string | null;
  displacements: VibrationalDisplacement[];
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
  size_bytes?: number | null;
  modified_time_ns?: number | null;
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
  frozen_atom_indices: number[];
  vibrational_modes: VibrationalMode[];
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

export type MoleculeEditCommandType =
  | 'set_atom_position'
  | 'set_atom_distance'
  | 'set_atom_angle'
  | 'set_atom_dihedral'
  | 'set_frozen_atoms'
  | 'add_bond'
  | 'remove_bond'
  | 'add_atom'
  | 'delete_atoms';

export interface SetAtomPositionCommand {
  command_type: 'set_atom_position';
  document_id: string;
  atom_index: number;
  position: CartesianPosition;
  coordinate_unit: 'angstrom';
}

export interface SetAtomDistanceCommand {
  command_type: 'set_atom_distance';
  document_id: string;
  atom1_index: number;
  atom2_index: number;
  distance: number;
  coordinate_unit: 'angstrom';
}

export interface SetAtomAngleCommand {
  command_type: 'set_atom_angle';
  document_id: string;
  atom1_index: number;
  vertex_atom_index: number;
  atom3_index: number;
  angle_degrees: number;
}

export interface SetAtomDihedralCommand {
  command_type: 'set_atom_dihedral';
  document_id: string;
  atom1_index: number;
  atom2_index: number;
  atom3_index: number;
  atom4_index: number;
  dihedral_degrees: number;
}

export type FrozenAtomAction = 'freeze' | 'unfreeze' | 'replace';

export interface SetFrozenAtomsCommand {
  command_type: 'set_frozen_atoms';
  document_id: string;
  atom_indices: number[];
  action: FrozenAtomAction;
}

export interface AddBondCommand {
  command_type: 'add_bond';
  document_id: string;
  atom1_index: number;
  atom2_index: number;
}

export interface RemoveBondCommand {
  command_type: 'remove_bond';
  document_id: string;
  atom1_index: number;
  atom2_index: number;
}

export interface AddAtomCommand {
  command_type: 'add_atom';
  document_id: string;
  element: string;
  position: CartesianPosition;
  coordinate_unit: 'angstrom';
}

export interface DeleteAtomsCommand {
  command_type: 'delete_atoms';
  document_id: string;
  atom_indices: number[];
}

export type MoleculeEditCommand =
  | SetAtomPositionCommand
  | SetAtomDistanceCommand
  | SetAtomAngleCommand
  | SetAtomDihedralCommand
  | SetFrozenAtomsCommand
  | AddBondCommand
  | RemoveBondCommand
  | AddAtomCommand
  | DeleteAtomsCommand;

export interface ApplyMoleculeEditRequest {
  document: MoleculeDocument;
  command: MoleculeEditCommand;
}

export interface MoleculeEditResponse {
  document: MoleculeDocument;
  can_undo: boolean;
  can_redo: boolean;
}

export type MoleculeExportFiletype = 'xyz' | 'gjf' | 'inp';
export type MoleculeExportPreviewFiletype = MoleculeExportFiletype;
export type MoleculeSourceWriteFiletype = 'xyz' | 'com' | 'gjf' | 'inp';

export interface MoleculeExportPreviewRequest {
  document: MoleculeDocument;
  filetype: MoleculeExportPreviewFiletype;
}

export interface MoleculeExportPreviewResponse {
  filename: string;
  filetype: MoleculeExportPreviewFiletype;
  content: string;
}

export interface MoleculeExportWriteRequest {
  document: MoleculeDocument;
  filetype: MoleculeExportFiletype;
  target_path: string;
}

export interface MoleculeExportWriteResponse {
  filename: string;
  filetype: MoleculeExportFiletype;
  path: string;
  bytes_written: number;
}

export interface MoleculeSourceWriteRequest {
  document: MoleculeDocument;
  confirmed: boolean;
}

export interface MoleculeSourceWriteResponse {
  document: MoleculeDocument;
  filename: string;
  filetype: MoleculeSourceWriteFiletype;
  path: string;
  bytes_written: number;
}

export type MoleculeSourceStatusValue =
  | 'current'
  | 'changed'
  | 'missing'
  | 'untracked';

export interface MoleculeSourceStatusRequest {
  document: MoleculeDocument;
}

export interface MoleculeSourceStatusResponse {
  status: MoleculeSourceStatusValue;
  message: string;
  opened_source: DocumentSource | null;
  current_source: DocumentSource | null;
}

export interface OpenDocumentRequest {
  path?: string;
  document_id?: string;
}
