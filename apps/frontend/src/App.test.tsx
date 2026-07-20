import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from './shared/types';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { App } from './App';

vi.mock('./viewer/MolecularViewer', () => ({
  MolecularViewer: ({ document }: { document: MoleculeDocument | null }) => (
    <output data-testid="viewer-document">{JSON.stringify(document)}</output>
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

describe('App', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      currentDocument: null,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
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
      .mockResolvedValueOnce(
        jsonResponse({
          ...WATER_DOCUMENT,
          source: {
            path: '/tmp/helium.xyz',
            filename: 'helium.xyz',
            filetype: 'xyz',
          },
        }),
      );

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
    useDocumentStore.setState({
      currentDocument: EDITED_WATER_DOCUMENT,
      canUndoMoleculeEdit: true,
      canRedoMoleculeEdit: false,
      moleculeEditUndoStack: [
        {
          beforeDocument: WATER_DOCUMENT,
          afterDocument: EDITED_WATER_DOCUMENT,
        },
      ],
      moleculeEditRedoStack: [],
    });

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
    useDocumentStore.setState({
      currentDocument: WATER_DOCUMENT,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: true,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [
        {
          beforeDocument: WATER_DOCUMENT,
          afterDocument: EDITED_WATER_DOCUMENT,
        },
      ],
    });

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
});
