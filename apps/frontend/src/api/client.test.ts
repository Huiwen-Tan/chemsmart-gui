import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ApplyMoleculeEditRequest,
  MoleculeDocument,
  MoleculeExportPreviewRequest,
  MoleculeExportPreviewResponse,
  MoleculeExportWriteRequest,
  MoleculeExportWriteResponse,
  MoleculeEditResponse,
  MoleculeSourceWriteRequest,
  MoleculeSourceWriteResponse,
} from '../shared/types';
import {
  applyMoleculeEdit,
  openDocument,
  previewMoleculeExport,
  writeMoleculeExport,
  writeMoleculeSource,
} from './client';

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

const BOND_EDIT_REQUEST: ApplyMoleculeEditRequest = {
  document: WATER_DOCUMENT,
  command: {
    command_type: 'remove_bond',
    document_id: WATER_DOCUMENT.id,
    atom1_index: 2,
    atom2_index: 1,
  },
};

const BOND_EDIT_RESPONSE: MoleculeEditResponse = {
  document: {
    ...WATER_DOCUMENT,
    id: 'document-water-unbonded',
    bonds: [],
  },
  can_undo: true,
  can_redo: false,
};

const ADD_ATOM_EDIT_REQUEST: ApplyMoleculeEditRequest = {
  document: WATER_DOCUMENT,
  command: {
    command_type: 'add_atom',
    document_id: WATER_DOCUMENT.id,
    element: 'He',
    position: { x: 1, y: 1.1, z: 1.2 },
    coordinate_unit: 'angstrom',
  },
};

const ADD_ATOM_EDIT_RESPONSE: MoleculeEditResponse = {
  document: {
    ...WATER_DOCUMENT,
    id: 'document-water-with-helium',
    atoms: [
      ...WATER_DOCUMENT.atoms,
      { index: 3, element: 'He', x: 1, y: 1.1, z: 1.2 },
    ],
  },
  can_undo: true,
  can_redo: false,
};

const EXPORT_PREVIEW_REQUEST: MoleculeExportPreviewRequest = {
  document: WATER_DOCUMENT,
  filetype: 'xyz',
};

const EXPORT_PREVIEW_RESPONSE: MoleculeExportPreviewResponse = {
  filename: 'water.xyz',
  filetype: 'xyz',
  content: '2\nwater.xyz    Empirical formula: H2O\nO 0 0 0\nH 1 1 1\n',
};

const EXPORT_WRITE_REQUEST: MoleculeExportWriteRequest = {
  document: WATER_DOCUMENT,
  filetype: 'xyz',
  target_path: '/tmp/water.xyz',
};

const EXPORT_WRITE_RESPONSE: MoleculeExportWriteResponse = {
  filename: 'water.xyz',
  filetype: 'xyz',
  path: '/tmp/water.xyz',
  bytes_written: 64,
};

const SOURCE_WRITE_REQUEST: MoleculeSourceWriteRequest = {
  document: WATER_DOCUMENT,
  confirmed: true,
};

const SOURCE_WRITE_RESPONSE: MoleculeSourceWriteResponse = {
  document: {
    ...WATER_DOCUMENT,
    source: {
      path: 'sample-data/water.xyz',
      filename: 'water.xyz',
      filetype: 'xyz',
      size_bytes: 64,
      modified_time_ns: 123,
    },
  },
  filename: 'water.xyz',
  filetype: 'xyz',
  path: 'sample-data/water.xyz',
  bytes_written: 64,
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

  it('posts molecule bond edit commands to the document edit API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BOND_EDIT_RESPONSE));

    await expect(applyMoleculeEdit(BOND_EDIT_REQUEST)).resolves.toEqual(
      BOND_EDIT_RESPONSE,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(BOND_EDIT_REQUEST),
      },
    );
  });

  it('posts molecule atom edit commands to the document edit API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ADD_ATOM_EDIT_RESPONSE));

    await expect(applyMoleculeEdit(ADD_ATOM_EDIT_REQUEST)).resolves.toEqual(
      ADD_ATOM_EDIT_RESPONSE,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/edit',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(ADD_ATOM_EDIT_REQUEST),
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

  it('posts molecule export previews to the document export API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(EXPORT_PREVIEW_RESPONSE));

    await expect(
      previewMoleculeExport(EXPORT_PREVIEW_REQUEST),
    ).resolves.toEqual(EXPORT_PREVIEW_RESPONSE);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export-preview',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(EXPORT_PREVIEW_REQUEST),
      },
    );
  });

  it('throws backend export preview detail from JSON errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: "Export preview filetype 'pdb' is not supported.",
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(
      previewMoleculeExport(EXPORT_PREVIEW_REQUEST),
    ).rejects.toThrow("Export preview filetype 'pdb' is not supported.");
  });

  it('posts molecule export writes to the document export API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(EXPORT_WRITE_RESPONSE));

    await expect(
      writeMoleculeExport(EXPORT_WRITE_REQUEST),
    ).resolves.toEqual(EXPORT_WRITE_RESPONSE);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(EXPORT_WRITE_REQUEST),
      },
    );
  });

  it('throws backend export write detail from JSON errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: 'Export target already exists: /tmp/water.xyz',
        },
        { status: 409, statusText: 'Conflict' },
      ),
    );

    await expect(
      writeMoleculeExport(EXPORT_WRITE_REQUEST),
    ).rejects.toThrow('Export target already exists: /tmp/water.xyz');
  });

  it('posts molecule source write-back to the source-write API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(SOURCE_WRITE_RESPONSE));

    await expect(
      writeMoleculeSource(SOURCE_WRITE_REQUEST),
    ).resolves.toEqual(SOURCE_WRITE_RESPONSE);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/source-write',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(SOURCE_WRITE_REQUEST),
      },
    );
  });

  it('throws backend source write detail from JSON errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          detail: 'Source file changed since this document was opened.',
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    await expect(
      writeMoleculeSource(SOURCE_WRITE_REQUEST),
    ).rejects.toThrow('Source file changed since this document was opened.');
  });
});
