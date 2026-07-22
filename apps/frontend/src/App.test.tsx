import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument, VibrationalMode } from './shared/types';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { App } from './App';

vi.mock('./viewer/MolecularViewer', () => ({
  MolecularViewer: ({
    document,
    selectedVibrationalMode,
  }: {
    document: MoleculeDocument | null;
    selectedVibrationalMode: VibrationalMode | null;
  }) => (
    <>
      <output data-testid="viewer-document">{JSON.stringify(document)}</output>
      <output data-testid="viewer-mode">
        {JSON.stringify(selectedVibrationalMode)}
      </output>
    </>
  ),
}));

const WATER_DOCUMENT = {
  id: '102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082',
  name: 'str-H2O-102b86d02472',
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
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

const EDITED_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'edited-water-document',
  atoms: [
    { index: 1, element: 'O', x: 0.1, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
  ],
} satisfies MoleculeDocument;

const BONDED_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'bonded-water-document',
  bonds: [
    ...WATER_DOCUMENT.bonds,
    { atom1: 2, atom2: 3 },
  ],
} satisfies MoleculeDocument;

const ADDED_ATOM_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'added-atom-water-document',
  atoms: [
    ...WATER_DOCUMENT.atoms,
    { index: 4, element: 'He', x: 1, y: 1.1, z: 1.2 },
  ],
} satisfies MoleculeDocument;

const DISTANCE_EDITED_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'distance-edited-water-document',
  atoms: [
    WATER_DOCUMENT.atoms[0],
    { index: 2, element: 'H', x: 1.5, y: 0, z: 0 },
    WATER_DOCUMENT.atoms[2],
  ],
} satisfies MoleculeDocument;

const ANGLE_EDITED_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'angle-edited-water-document',
  atoms: [
    WATER_DOCUMENT.atoms[0],
    WATER_DOCUMENT.atoms[1],
    { index: 3, element: 'H', x: -1, y: 1.732, z: 0 },
  ],
} satisfies MoleculeDocument;

const DIHEDRAL_FRAGMENT_DOCUMENT = {
  id: 'dihedral-fragment-document',
  name: 'dihedral-fragment',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'C', x: 1, y: 0, z: 0 },
    { index: 2, element: 'C', x: 0, y: 0, z: 0 },
    { index: 3, element: 'C', x: 0, y: 1, z: 0 },
    { index: 4, element: 'H', x: 0, y: 1, z: 1 },
  ],
  bonds: [],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

const DIHEDRAL_EDITED_FRAGMENT_DOCUMENT = {
  ...DIHEDRAL_FRAGMENT_DOCUMENT,
  id: 'dihedral-edited-fragment-document',
  atoms: [
    DIHEDRAL_FRAGMENT_DOCUMENT.atoms[0],
    DIHEDRAL_FRAGMENT_DOCUMENT.atoms[1],
    DIHEDRAL_FRAGMENT_DOCUMENT.atoms[2],
    { index: 4, element: 'H', x: 0.5, y: 1, z: -0.866 },
  ],
} satisfies MoleculeDocument;

const DELETED_ATOM_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'deleted-atom-water-document',
  atoms: [
    WATER_DOCUMENT.atoms[0],
    { ...WATER_DOCUMENT.atoms[2], index: 2 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
} satisfies MoleculeDocument;

const FROZEN_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  frozen_atom_indices: [1, 3],
} satisfies MoleculeDocument;

const SAVED_EDITED_WATER_DOCUMENT = {
  ...EDITED_WATER_DOCUMENT,
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
    size_bytes: 128,
    modified_time_ns: 123,
  },
} satisfies MoleculeDocument;

const REOPENED_WATER_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'reopened-water-document',
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
    size_bytes: 256,
    modified_time_ns: 456,
  },
} satisfies MoleculeDocument;

const CURRENT_EDITED_SOURCE_STATUS_RESPONSE = {
  status: 'current',
  message: 'Source file matches the opened revision.',
  opened_source: EDITED_WATER_DOCUMENT.source,
  current_source: SAVED_EDITED_WATER_DOCUMENT.source,
};

const CHANGED_EDITED_SOURCE_STATUS_RESPONSE = {
  ...CURRENT_EDITED_SOURCE_STATUS_RESPONSE,
  status: 'changed',
  message: 'Source file changed since this document was opened.',
  current_source: REOPENED_WATER_DOCUMENT.source,
};

const HELIUM_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'helium-document',
  name: 'str-He',
  source: {
    path: '/tmp/helium.xyz',
    filename: 'helium.xyz',
    filetype: 'xyz',
  },
  atoms: [{ index: 1, element: 'He', x: 0, y: 0, z: 0 }],
  bonds: [],
} satisfies MoleculeDocument;

const GAUSSIAN_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'gaussian-water-document',
  source: {
    path: 'sample-data/water.gjf',
    filename: 'water.gjf',
    filetype: 'gjf',
  },
  charge: 0,
  multiplicity: 1,
} satisfies MoleculeDocument;

const GAUSSIAN_OUTPUT_DOCUMENT = {
  ...WATER_DOCUMENT,
  id: 'gaussian-output-water-document',
  source: {
    path: 'sample-data/water.log',
    filename: 'water.log',
    filetype: 'log',
  },
  calculation: {
    program: 'gaussian',
    normal_termination: true,
  },
  vibrational_modes: [
    {
      index: 1,
      frequency_cm_minus_1: -530.2,
      is_imaginary: true,
      reduced_mass_amu: 1.2,
      force_constant_mdyne_per_angstrom: 0.3,
      ir_intensity_km_per_mol: 12.3,
      symmetry: 'A1',
      displacements: [
        { atom_index: 1, x: 0, y: 0, z: -0.1 },
        { atom_index: 2, x: 0.2, y: 0, z: 0.1 },
      ],
    },
    {
      index: 2,
      frequency_cm_minus_1: 1628.3334,
      is_imaginary: false,
      reduced_mass_amu: null,
      force_constant_mdyne_per_angstrom: null,
      ir_intensity_km_per_mol: null,
      symmetry: null,
      displacements: [],
    },
  ],
} satisfies MoleculeDocument;

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

function setUndoHistory(): void {
  useDocumentStore.setState({
    currentDocument: EDITED_WATER_DOCUMENT,
    canUndoMoleculeEdit: true,
    canRedoMoleculeEdit: false,
    hasUnsavedMoleculeEdits: true,
    moleculeEditUndoStack: [
      {
        beforeDocument: WATER_DOCUMENT,
        afterDocument: EDITED_WATER_DOCUMENT,
      },
    ],
    moleculeEditRedoStack: [],
  });
}

function setRedoHistory(): void {
  useDocumentStore.setState({
    currentDocument: WATER_DOCUMENT,
    canUndoMoleculeEdit: false,
    canRedoMoleculeEdit: true,
    hasUnsavedMoleculeEdits: false,
    moleculeEditUndoStack: [],
    moleculeEditRedoStack: [
      {
        beforeDocument: WATER_DOCUMENT,
        afterDocument: EDITED_WATER_DOCUMENT,
      },
    ],
  });
}

describe('App', () => {
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
    useViewerStore.setState({
      selectedAtomIndices: [],
      showBonds: true,
      showAtomLabels: false,
      viewResetRequestId: 0,
    });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('passes the normalized sample XYZ response to the viewer', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    expect(screen.getByLabelText('Document path')).toHaveValue(
      'sample-data/water.xyz',
    );
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');
    expect(screen.getByText('No document loaded.')).toBeInTheDocument();
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    const documentSummary = screen.getByRole('region', {
      name: 'Current Document',
    });
    expect(
      within(documentSummary).getByText('str-H2O-102b86d02472'),
    ).toBeInTheDocument();
    expect(within(documentSummary).getByText('structure')).toBeInTheDocument();
    expect(within(documentSummary).getByText('water.xyz')).toBeInTheDocument();
    expect(within(documentSummary).getByText('xyz')).toBeInTheDocument();
    expect(
      within(documentSummary).getByText('sample-data/water.xyz'),
    ).toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/documents/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'sample-data/water.xyz' }),
      }),
    );
  });

  it('submits the edited document path to the open-document API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(HELIUM_DOCUMENT));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: ' /tmp/helium.xyz ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'http://127.0.0.1:8000/api/documents/open',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ path: '/tmp/helium.xyz' }),
        }),
      );
    });
    expect(screen.getByText('/tmp/helium.xyz')).toBeInTheDocument();
  });

  it('reports a local error for blank document paths', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    expect(
      screen.getByText('Error: A document path is required.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');
  });

  it('does not prompt before blank document path validation', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    expect(
      screen.getByText('Error: A document path is required.'),
    ).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
  });

  it('keeps unsaved molecule edits when replacing the document is declined', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: '/tmp/helium.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    expect(confirm).toHaveBeenCalledWith(
      'Current molecule has unsaved edits. Open a different document and discard them?',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
  });

  it('opens the requested document after confirming unsaved edit replacement', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(HELIUM_DOCUMENT));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: '/tmp/helium.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(HELIUM_DOCUMENT),
      );
    });
    expect(confirm).toHaveBeenCalledWith(
      'Current molecule has unsaved edits. Open a different document and discard them?',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/documents/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: '/tmp/helium.xyz' }),
      }),
    );
    expect(screen.getByText('No unsaved edits')).toBeInTheDocument();
  });

  it('adds a selected atom bond through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: BONDED_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [2, 3] });
    });

    expect(screen.getByText('Current bond: absent')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Bond' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(BONDED_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'add_bond',
            document_id: WATER_DOCUMENT.id,
            atom1_index: 2,
            atom2_index: 3,
          },
        }),
      }),
    );
  });

  it('adds an atom through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: ADDED_ATOM_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    fireEvent.change(screen.getByLabelText('New atom element'), {
      target: { value: 'He' },
    });
    fireEvent.change(screen.getByLabelText('New atom X coordinate'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('New atom Y coordinate'), {
      target: { value: '1.1' },
    });
    fireEvent.change(screen.getByLabelText('New atom Z coordinate'), {
      target: { value: '1.2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Atom' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(ADDED_ATOM_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'add_atom',
            document_id: WATER_DOCUMENT.id,
            element: 'He',
            position: { x: 1, y: 1.1, z: 1.2 },
            coordinate_unit: 'angstrom',
          },
        }),
      }),
    );
  });

  it('sets selected atom distance through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: DISTANCE_EDITED_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [1, 2] });
    });
    fireEvent.change(screen.getByLabelText('Selected atom distance'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Distance' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(DISTANCE_EDITED_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'set_atom_distance',
            document_id: WATER_DOCUMENT.id,
            atom1_index: 1,
            atom2_index: 2,
            distance: 1.5,
            coordinate_unit: 'angstrom',
          },
        }),
      }),
    );
  });

  it('freezes selected atoms through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: FROZEN_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [1, 3] });
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Freeze Selected Atoms' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(FROZEN_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'set_frozen_atoms',
            document_id: WATER_DOCUMENT.id,
            atom_indices: [1, 3],
            action: 'freeze',
          },
        }),
      }),
    );
  });

  it('sets selected atom angle through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: ANGLE_EDITED_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [3, 1, 2] });
    });
    fireEvent.change(screen.getByLabelText('Selected atom angle'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Angle' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(ANGLE_EDITED_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'set_atom_angle',
            document_id: WATER_DOCUMENT.id,
            atom1_index: 3,
            vertex_atom_index: 1,
            atom3_index: 2,
            angle_degrees: 120,
          },
        }),
      }),
    );
  });

  it('sets selected atom dihedral through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(DIHEDRAL_FRAGMENT_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: DIHEDRAL_EDITED_FRAGMENT_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(DIHEDRAL_FRAGMENT_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [1, 2, 3, 4] });
    });
    fireEvent.change(screen.getByLabelText('Selected atom dihedral'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Dihedral' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(DIHEDRAL_EDITED_FRAGMENT_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: DIHEDRAL_FRAGMENT_DOCUMENT,
          command: {
            command_type: 'set_atom_dihedral',
            document_id: DIHEDRAL_FRAGMENT_DOCUMENT.id,
            atom1_index: 1,
            atom2_index: 2,
            atom3_index: 3,
            atom4_index: 4,
            dihedral_degrees: 60,
          },
        }),
      }),
    );
  });

  it('deletes a selected atom through edit controls', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          document: DELETED_ATOM_WATER_DOCUMENT,
          can_undo: true,
          can_redo: false,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    act(() => {
      useViewerStore.setState({ selectedAtomIndices: [2] });
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Selected Atoms' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(DELETED_ATOM_WATER_DOCUMENT),
      );
    });
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/edit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          command: {
            command_type: 'delete_atoms',
            document_id: WATER_DOCUMENT.id,
            atom_indices: [2],
          },
        }),
      }),
    );
  });

  it('preserves selection when sample molecule loading fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockRejectedValueOnce(new Error('Open failed'));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByText('Error: Open failed')).toBeInTheDocument();
    });
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 2]);
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');
  });

  it('displays backend document-open error details', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(
        jsonErrorResponse({
          detail: "No molecular structure found in 'empty.xyz'.",
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: 'empty.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Error: No molecular structure found in 'empty.xyz'.",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');
  });

  it('renders vibrational mode table for output documents', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(GAUSSIAN_OUTPUT_DOCUMENT));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: 'sample-data/water.log' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(GAUSSIAN_OUTPUT_DOCUMENT),
      );
    });
    expect(screen.getByTestId('viewer-mode')).toHaveTextContent(
      JSON.stringify(GAUSSIAN_OUTPUT_DOCUMENT.vibrational_modes[0]),
    );
    const modesPanel = screen.getByRole('region', {
      name: 'Vibrational Modes',
    });
    const table = within(modesPanel).getByRole('table', {
      name: 'Vibrational mode table',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('-530.2');
    expect(rows[1]).toHaveTextContent('Imaginary');
    expect(rows[2]).toHaveTextContent('1628.3334');
    expect(rows[2]).toHaveTextContent('Real');
    expect(
      within(modesPanel).getByRole('heading', { name: 'Selected Mode 1' }),
    ).toBeInTheDocument();
    const displacementTable = within(modesPanel).getByRole('table', {
      name: 'Selected mode displacement vectors',
    });
    expect(within(displacementTable).getByText('-0.1')).toBeInTheDocument();
    expect(within(displacementTable).getByText('0.2')).toBeInTheDocument();

    fireEvent.click(
      within(modesPanel).getByRole('button', { name: 'Select mode 2' }),
    );

    expect(screen.getByTestId('viewer-mode')).toHaveTextContent(
      JSON.stringify(GAUSSIAN_OUTPUT_DOCUMENT.vibrational_modes[1]),
    );
    expect(
      within(modesPanel).getByRole('heading', { name: 'Selected Mode 2' }),
    ).toBeInTheDocument();
  });

  it('previews XYZ export content for the loaded document', async () => {
    const xyzPreviewContent =
      '3\nwater.xyz    Empirical formula: H2O\nO 0 0 0\nH 1 1 1\nH -1 1 1\n';
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water.xyz',
          filetype: 'xyz',
          content: xyzPreviewContent,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
        xyzPreviewContent,
      );
    });
    expect(
      within(
        screen.getByRole('region', { name: 'Export Preview' }),
      ).getByText('water.xyz'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/export-preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          filetype: 'xyz',
        }),
      }),
    );
  });

  it('previews Gaussian input export content for a Gaussian document', async () => {
    const gjfPreviewContent =
      '%chk=water.chk\n%nprocshared=1\n%mem=1GB\n# hf/sto-3g opt\n\nwater\n\n0 1\nO 0 0 0\n';
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(GAUSSIAN_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water.gjf',
          filetype: 'gjf',
          content: gjfPreviewContent,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: 'sample-data/water.gjf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(GAUSSIAN_DOCUMENT),
      );
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview Gaussian Input' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('GJF export preview').textContent).toBe(
        gjfPreviewContent,
      );
    });
    expect(
      within(
        screen.getByRole('region', { name: 'Export Preview' }),
      ).getByText('water.gjf'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/export-preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: GAUSSIAN_DOCUMENT,
          filetype: 'gjf',
        }),
      }),
    );
  });

  it('saves XYZ export content to a backend target path', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT))
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water-copy.xyz',
          filetype: 'xyz',
          path: '/tmp/water-copy.xyz',
          bytes_written: 128,
        }),
      );

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water-copy.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/water-copy.xyz')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/export',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          filetype: 'xyz',
          target_path: '/tmp/water-copy.xyz',
        }),
      }),
    );
  });

  it('writes source changes back and clears unsaved edit state', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(CURRENT_EDITED_SOURCE_STATUS_RESPONSE))
      .mockResolvedValueOnce(
        jsonResponse({
          document: SAVED_EDITED_WATER_DOCUMENT,
          filename: 'water.xyz',
          filetype: 'xyz',
          path: 'sample-data/water.xyz',
          bytes_written: 128,
        }),
      );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Update Source File' }),
    );

    await waitFor(() => {
      expect(screen.getByText('No unsaved edits')).toBeInTheDocument();
    });
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('sample-data/water.xyz'),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(SAVED_EDITED_WATER_DOCUMENT),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/documents/source-status',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: EDITED_WATER_DOCUMENT,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/source-write',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: EDITED_WATER_DOCUMENT,
          confirmed: true,
        }),
      }),
    );
  });

  it('reopens a changed source from the export panel', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(CHANGED_EDITED_SOURCE_STATUS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(REOPENED_WATER_DOCUMENT));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Update Source File' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reopen Source File' }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Reopen Source File' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(REOPENED_WATER_DOCUMENT),
      );
    });
    expect(confirm).toHaveBeenCalledWith(
      'Current molecule has unsaved edits. Open a different document and discard them?',
    );
    expect(screen.getByText('No unsaved edits')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/documents/source-status',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          document: EDITED_WATER_DOCUMENT,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://127.0.0.1:8000/api/documents/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'sample-data/water.xyz' }),
      }),
    );
  });

  it('keeps stale edits when source reopen confirmation is declined', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(CHANGED_EDITED_SOURCE_STATUS_RESPONSE));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole('button', { name: 'Update Source File' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reopen Source File' }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Reopen Source File' }),
    );

    expect(confirm).toHaveBeenCalledWith(
      'Current molecule has unsaved edits. Open a different document and discard them?',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument();
    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
  });

  it('toggles the viewer bond display setting', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    const showBondsControl = screen.getByRole('checkbox', {
      name: 'Show Bonds',
    });

    expect(showBondsControl).toBeChecked();
    expect(useViewerStore.getState().showBonds).toBe(true);

    fireEvent.click(showBondsControl);

    expect(showBondsControl).not.toBeChecked();
    expect(useViewerStore.getState().showBonds).toBe(false);
    expect(useDocumentStore.getState().currentDocument).toBeNull();
  });

  it('toggles the viewer atom label display setting', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    const showAtomLabelsControl = screen.getByRole('checkbox', {
      name: 'Show Atom Labels',
    });

    expect(showAtomLabelsControl).not.toBeChecked();
    expect(useViewerStore.getState().showAtomLabels).toBe(false);

    fireEvent.click(showAtomLabelsControl);

    expect(showAtomLabelsControl).toBeChecked();
    expect(useViewerStore.getState().showAtomLabels).toBe(true);
    expect(useDocumentStore.getState().currentDocument).toBeNull();
  });

  it('requests a viewer reset from the toolbar', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reset View' }));

    expect(useViewerStore.getState().viewResetRequestId).toBe(1);
    expect(useDocumentStore.getState().currentDocument).toBeNull();
  });

  it('disables molecule edit undo and redo controls with no history', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });

  it('undoes a molecule edit from the toolbar', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Undo Edit' }));

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeEnabled();
  });

  it('redoes a molecule edit from the toolbar', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setRedoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Redo Edit' }));

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });

  it('undoes a molecule edit with the primary undo shortcut', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'z', metaKey: true });

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeEnabled();
  });

  it('redoes a molecule edit with the shift redo shortcut', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setRedoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });

  it('redoes a molecule edit with the y redo shortcut', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setRedoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });

  it('ignores molecule edit shortcuts when edit history is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    useDocumentStore.setState({
      currentDocument: EDITED_WATER_DOCUMENT,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      hasUnsavedMoleculeEdits: false,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [],
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });

  it('keeps molecule edit shortcuts out of editable text controls', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    setUndoHistory();

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByLabelText('Document path'), {
      key: 'z',
      metaKey: true,
    });

    expect(screen.getByTestId('viewer-document')).toHaveTextContent(
      JSON.stringify(EDITED_WATER_DOCUMENT),
    );
    expect(screen.getByRole('button', { name: 'Undo Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo Edit' })).toBeDisabled();
  });
});
