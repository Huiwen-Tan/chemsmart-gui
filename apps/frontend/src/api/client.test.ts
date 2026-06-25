import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ApplyMoleculeEditRequest,
  MoleculeDocument,
  MoleculeEditResponse,
} from '../shared/types';
import { applyMoleculeEdit, openDocument } from './client';

const fetchMock = vi.fn<typeof fetch>();

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'document-water',
  name: 'str-H2O-document',
  document_kind: 'structure',
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
  },
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
};

const EDIT_REQUEST: ApplyMoleculeEditRequest = {
  document: WATER_DOCUMENT,
  command: {
    command_type: 'set_atom_position',
    document_id: WATER_DOCUMENT.id,
    atom_index: 2,
    position: { x: 1, y: 1.1, z: 1.2 },
    coordinate_unit: 'angstrom',
  },
};

const EDIT_RESPONSE: MoleculeEditResponse = {
  document: {
    ...WATER_DOCUMENT,
    id: 'document-water-edited',
    atoms: [
      WATER_DOCUMENT.atoms[0],
      { index: 2, element: 'H', x: 1, y: 1.1, z: 1.2 },
    ],
  },
  can_undo: true,
  can_redo: false,
};

function jsonResponse(
  body: unknown,
  init: ResponseInit = { status: 200 },
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws backend error detail from JSON error responses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: "Could not open molecular file 'empty.xyz': invalid file",
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(openDocument({ path: 'empty.xyz' })).rejects.toThrow(
      "Could not open molecular file 'empty.xyz': invalid file",
    );
  });

  it('falls back to HTTP status when no backend detail is available', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('server error', {
        headers: { 'Content-Type': 'text/plain' },
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(openDocument({ path: 'water.xyz' })).rejects.toThrow(
      'Request failed (500): Internal Server Error',
    );
  });

  it('posts molecule edit commands to the document edit API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(EDIT_RESPONSE));

    await expect(applyMoleculeEdit(EDIT_REQUEST)).resolves.toEqual(
      EDIT_RESPONSE,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(EDIT_REQUEST),
      },
    );
  });

  it('throws backend edit error detail from JSON error responses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail:
            "Edit command targets document 'other-document', but active document is 'document-water'.",
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(applyMoleculeEdit(EDIT_REQUEST)).rejects.toThrow(
      "Edit command targets document 'other-document'",
    );
  });
});
