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

export type DocumentKind = 'structure';

export interface MoleculeDocument {
  id: string;
  name: string;
  document_kind: DocumentKind;
  coordinate_unit: 'angstrom';
  charge: number | null;
  multiplicity: number | null;
  atoms: Atom[];
  bonds: Bond[];
}

export interface OpenDocumentRequest {
  path?: string;
  document_id?: string;
}
