import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument, SetAtomPositionCommand } from '../shared/types';
import { useViewerStore } from './useViewerStore';
import { useDocumentStore } from './useDocumentStore';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'water',
  document_kind: 'structure',
  source: null,
  calculation: null,
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

const EDITED_WATER: MoleculeDocument = {
  ...WATER,
  id: 'edited-water',
  atoms: [
    WATER.atoms[0],
    { index: 2, element: 'H', x: 1, y: 1.1, z: 1.2 },
    WATER.atoms[2],
  ],
};

const SET_ATOM_POSITION: SetAtomPositionCommand = {
  command_type: 'set_atom_position',
  document_id: WATER.id,
  atom_index: 2,
  position: { x: 1, y: 1.1, z: 1.2 },
  coordinate_unit: 'angstrom',
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonErrorResponse(
  body: unknown,
  init: ResponseInit = { status: 400, statusText: 'Bad Request' },
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      currentDocument: null,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
    });
    useViewerStore.setState({ selectedAtomIndices: [] });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the active document, clears selection, and resets edit state', () => {
    useDocumentStore.setState({
      canUndoMoleculeEdit: true,
      canRedoMoleculeEdit: true,
      isApplyingMoleculeEdit: true,
      moleculeEditError: 'Previous error',
    });
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    useDocumentStore.getState().setCurrentDocument(WATER);

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBeNull();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });

  it('clears viewer atom selection when the active document is cleared', () => {
    useDocumentStore.setState({ currentDocument: WATER });
    useViewerStore.setState({ selectedAtomIndices: [1] });

    useDocumentStore.getState().setCurrentDocument(null);

    expect(useDocumentStore.getState().currentDocument).toBeNull();
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });

  it('applies molecule edit commands through the API client', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document: EDITED_WATER,
        can_undo: true,
        can_redo: false,
      }),
    );
    useDocumentStore.setState({ currentDocument: WATER });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    await useDocumentStore
      .getState()
      .applyMoleculeEditCommand(SET_ATOM_POSITION);

    expect(useDocumentStore.getState().currentDocument).toEqual(EDITED_WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBeNull();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER,
          command: SET_ATOM_POSITION,
        }),
      },
    );
  });

  it('records an error when applying an edit without a document', async () => {
    await useDocumentStore
      .getState()
      .applyMoleculeEditCommand(SET_ATOM_POSITION);

    expect(useDocumentStore.getState().currentDocument).toBeNull();
    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'No document is loaded.',
    );
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the current document and records backend edit errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonErrorResponse({
        detail: 'Atom index 99 was not found in document water.',
      }),
    );
    useDocumentStore.setState({
      currentDocument: WATER,
      canUndoMoleculeEdit: true,
      canRedoMoleculeEdit: false,
    });

    await useDocumentStore.getState().applyMoleculeEditCommand({
      ...SET_ATOM_POSITION,
      atom_index: 99,
    });

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'Atom index 99 was not found in document water.',
    );
  });
});
