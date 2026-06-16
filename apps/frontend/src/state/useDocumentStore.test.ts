import { beforeEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { useViewerStore } from './useViewerStore';
import { useDocumentStore } from './useDocumentStore';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'water',
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
};

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({ currentDocument: null });
    useViewerStore.setState({ selectedAtomIndices: [] });
  });

  it('stores the active document and clears viewer atom selection', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    useDocumentStore.getState().setCurrentDocument(WATER);

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });

  it('clears viewer atom selection when the active document is cleared', () => {
    useDocumentStore.setState({ currentDocument: WATER });
    useViewerStore.setState({ selectedAtomIndices: [1] });

    useDocumentStore.getState().setCurrentDocument(null);

    expect(useDocumentStore.getState().currentDocument).toBeNull();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });
});
