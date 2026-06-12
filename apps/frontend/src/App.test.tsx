import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from './shared/types';
import { useDocumentStore } from './state/useDocumentStore';
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
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes the normalized sample XYZ response to the viewer', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(WATER_DOCUMENT));

    render(<App />);

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument());
    expect(screen.getByTestId('viewer-document')).toHaveTextContent('null');

    fireEvent.click(
      screen.getByRole('button', { name: 'Load Sample Molecule' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('viewer-document')).toHaveTextContent(
        JSON.stringify(WATER_DOCUMENT),
      );
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/documents/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: 'sample-data/water.xyz' }),
      }),
    );
  });
});
