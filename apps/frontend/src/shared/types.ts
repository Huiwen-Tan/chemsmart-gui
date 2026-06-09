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

export interface MoleculeDocument {
  id: string;
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface OpenDocumentRequest {
  path?: string;
  document_id?: string;
}
