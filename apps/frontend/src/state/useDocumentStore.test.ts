import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AddAtomCommand,
  AddBondCommand,
  DeleteAtomsCommand,
  MoleculeDocument,
  SetAtomPositionCommand,
} from '../shared/types';
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

const SAVED_EDITED_WATER: MoleculeDocument = {
  ...EDITED_WATER,
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
    size_bytes: 128,
    modified_time_ns: 123,
  },
};

const REEDITED_WATER: MoleculeDocument = {
  ...WATER,
  id: 'reedited-water',
  atoms: [
    WATER.atoms[0],
    { index: 2, element: 'H', x: 2, y: 2.1, z: 2.2 },
    WATER.atoms[2],
  ],
};

const BONDED_WATER: MoleculeDocument = {
  ...WATER,
  id: 'bonded-water',
  bonds: [
    ...WATER.bonds,
    { atom1: 2, atom2: 3 },
  ],
};

const ADDED_ATOM_WATER: MoleculeDocument = {
  ...WATER,
  id: 'added-atom-water',
  atoms: [
    ...WATER.atoms,
    { index: 4, element: 'He', x: 1, y: 1.1, z: 1.2 },
  ],
};

const DELETED_ATOM_WATER: MoleculeDocument = {
  ...WATER,
  id: 'deleted-atom-water',
  atoms: [
    WATER.atoms[0],
    { ...WATER.atoms[2], index: 2 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
};

const SET_ATOM_POSITION: SetAtomPositionCommand = {
  command_type: 'set_atom_position',
  document_id: WATER.id,
  atom_index: 2,
  position: { x: 1, y: 1.1, z: 1.2 },
  coordinate_unit: 'angstrom',
};

const ADD_BOND: AddBondCommand = {
  command_type: 'add_bond',
  document_id: WATER.id,
  atom1_index: 2,
  atom2_index: 3,
};

const ADD_ATOM: AddAtomCommand = {
  command_type: 'add_atom',
  document_id: WATER.id,
  element: 'He',
  position: { x: 1, y: 1.1, z: 1.2 },
  coordinate_unit: 'angstrom',
};

const DELETE_ATOMS: DeleteAtomsCommand = {
  command_type: 'delete_atoms',
  document_id: WATER.id,
  atom_indices: [2],
};

const SET_ATOM_POSITION_AGAIN: SetAtomPositionCommand = {
  ...SET_ATOM_POSITION,
  position: { x: 2, y: 2.1, z: 2.2 },
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
      hasUnsavedMoleculeEdits: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [],
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
      hasUnsavedMoleculeEdits: true,
      isApplyingMoleculeEdit: true,
      moleculeEditError: 'Previous error',
      moleculeEditUndoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
      moleculeEditRedoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
    });
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    useDocumentStore.getState().setCurrentDocument(WATER);

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(false);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBeNull();
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });

  it('clears viewer atom selection when the active document is cleared', () => {
    useDocumentStore.setState({
      currentDocument: WATER,
      hasUnsavedMoleculeEdits: true,
      moleculeEditUndoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
    });
    useViewerStore.setState({ selectedAtomIndices: [1] });

    useDocumentStore.getState().setCurrentDocument(null);

    expect(useDocumentStore.getState().currentDocument).toBeNull();
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(false);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
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
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBeNull();
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([
      {
        beforeDocument: WATER,
        afterDocument: EDITED_WATER,
      },
    ]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
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

  it('applies molecule bond edit commands through the API client', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document: BONDED_WATER,
        can_undo: true,
        can_redo: false,
      }),
    );
    useDocumentStore.setState({ currentDocument: WATER });
    useViewerStore.setState({ selectedAtomIndices: [2, 3] });

    await useDocumentStore.getState().applyMoleculeEditCommand(ADD_BOND);

    expect(useDocumentStore.getState().currentDocument).toEqual(BONDED_WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([
      {
        beforeDocument: WATER,
        afterDocument: BONDED_WATER,
      },
    ]);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([2, 3]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER,
          command: ADD_BOND,
        }),
      },
    );
  });

  it('applies molecule add atom commands through the API client', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document: ADDED_ATOM_WATER,
        can_undo: true,
        can_redo: false,
      }),
    );
    useDocumentStore.setState({ currentDocument: WATER });

    await useDocumentStore.getState().applyMoleculeEditCommand(ADD_ATOM);

    expect(useDocumentStore.getState().currentDocument).toEqual(
      ADDED_ATOM_WATER,
    );
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([
      {
        beforeDocument: WATER,
        afterDocument: ADDED_ATOM_WATER,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER,
          command: ADD_ATOM,
        }),
      },
    );
  });

  it('applies molecule delete atom commands and clears selection', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        document: DELETED_ATOM_WATER,
        can_undo: true,
        can_redo: false,
      }),
    );
    useDocumentStore.setState({ currentDocument: WATER });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    await useDocumentStore.getState().applyMoleculeEditCommand(DELETE_ATOMS);

    expect(useDocumentStore.getState().currentDocument).toEqual(
      DELETED_ATOM_WATER,
    );
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([
      {
        beforeDocument: WATER,
        afterDocument: DELETED_ATOM_WATER,
      },
    ]);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER,
          command: DELETE_ATOMS,
        }),
      },
    );
  });

  it('undoes and redoes molecule edit snapshots without clearing selection', async () => {
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

    useDocumentStore.getState().undoMoleculeEdit();

    expect(useDocumentStore.getState().currentDocument).toEqual(WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(false);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toHaveLength(1);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([2]);

    useDocumentStore.getState().redoMoleculeEdit();

    expect(useDocumentStore.getState().currentDocument).toEqual(EDITED_WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toHaveLength(1);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([2]);
  });

  it('clears redo history after applying a new molecule edit', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          document: EDITED_WATER,
          can_undo: true,
          can_redo: false,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          document: REEDITED_WATER,
          can_undo: true,
          can_redo: false,
        }),
      );
    useDocumentStore.setState({ currentDocument: WATER });

    await useDocumentStore
      .getState()
      .applyMoleculeEditCommand(SET_ATOM_POSITION);
    useDocumentStore.getState().undoMoleculeEdit();
    await useDocumentStore
      .getState()
      .applyMoleculeEditCommand(SET_ATOM_POSITION_AGAIN);

    expect(useDocumentStore.getState().currentDocument).toEqual(REEDITED_WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([
      {
        beforeDocument: WATER,
        afterDocument: REEDITED_WATER,
      },
    ]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
  });

  it('records errors when undo or redo history is unavailable', () => {
    useDocumentStore.getState().undoMoleculeEdit();

    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'No molecule edit is available to undo.',
    );

    useDocumentStore.getState().redoMoleculeEdit();

    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'No molecule edit is available to redo.',
    );
  });

  it('marks a saved molecule document as the clean edit baseline', () => {
    useDocumentStore.setState({
      currentDocument: EDITED_WATER,
      canUndoMoleculeEdit: true,
      canRedoMoleculeEdit: true,
      hasUnsavedMoleculeEdits: true,
      isApplyingMoleculeEdit: true,
      moleculeEditError: 'Previous error',
      moleculeEditUndoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
      moleculeEditRedoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
    });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    useDocumentStore.getState().markMoleculeDocumentSaved(SAVED_EDITED_WATER);

    expect(useDocumentStore.getState().currentDocument).toEqual(
      SAVED_EDITED_WATER,
    );
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(false);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBeNull();
    expect(useDocumentStore.getState().moleculeEditUndoStack).toEqual([]);
    expect(useDocumentStore.getState().moleculeEditRedoStack).toEqual([]);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([2]);
  });

  it('records an error when saving a different active document', () => {
    useDocumentStore.setState({
      currentDocument: WATER,
      hasUnsavedMoleculeEdits: true,
    });

    useDocumentStore.getState().markMoleculeDocumentSaved(SAVED_EDITED_WATER);

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'Saved document does not match the active document.',
    );
  });

  it('records an error when applying an edit without a document', async () => {
    await useDocumentStore
      .getState()
      .applyMoleculeEditCommand(SET_ATOM_POSITION);

    expect(useDocumentStore.getState().currentDocument).toBeNull();
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(false);
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
      hasUnsavedMoleculeEdits: true,
      moleculeEditUndoStack: [
        {
          beforeDocument: WATER,
          afterDocument: EDITED_WATER,
        },
      ],
    });

    await useDocumentStore.getState().applyMoleculeEditCommand({
      ...SET_ATOM_POSITION,
      atom_index: 99,
    });

    expect(useDocumentStore.getState().currentDocument).toBe(WATER);
    expect(useDocumentStore.getState().canUndoMoleculeEdit).toBe(true);
    expect(useDocumentStore.getState().canRedoMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().hasUnsavedMoleculeEdits).toBe(true);
    expect(useDocumentStore.getState().isApplyingMoleculeEdit).toBe(false);
    expect(useDocumentStore.getState().moleculeEditError).toBe(
      'Atom index 99 was not found in document water.',
    );
  });
});
