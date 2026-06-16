import {
  cleanup,
  fireEvent,
  render,
  screen,
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

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('App', () => {
  beforeEach(() => {
    useDocumentStore.setState({ currentDocument: null });
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
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    fireEvent.click(
      screen.getByRole('button', { name: 'Load Sample Molecule' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });
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

  it('preserves selection when sample molecule loading fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockRejectedValueOnce(new Error('Open failed'));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    fireEvent.click(
      screen.getByRole('button', { name: 'Load Sample Molecule' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Open failed')).toBeInTheDocument();
    });
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 2]);
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
});
