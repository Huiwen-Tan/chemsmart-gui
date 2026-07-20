import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { MoleculeExportPreviewPanel } from './MoleculeExportPreviewPanel';

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'water-document',
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

const HELIUM_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'helium-document',
  name: 'str-He-document',
  source: {
    path: 'sample-data/helium.xyz',
    filename: 'helium.xyz',
    filetype: 'xyz',
  },
  atoms: [{ index: 1, element: 'He', x: 0, y: 0, z: 0 }],
  bonds: [],
};

const XYZ_PREVIEW_CONTENT =
  '2\nwater.xyz    Empirical formula: H2O\nO 0 0 0\nH 1 1 1\n';

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

describe('MoleculeExportPreviewPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('disables XYZ preview when no molecule document is loaded', () => {
    render(<MoleculeExportPreviewPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Export Preview' });
    expect(
      within(panel).getByRole('button', { name: 'Preview XYZ Export' }),
    ).toBeDisabled();
    expect(
      within(panel).getByText('No molecule document loaded.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('previews backend-generated XYZ export content', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByText('water.xyz')).toBeInTheDocument();
    });
    expect(screen.getByText('xyz')).toBeInTheDocument();
    expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
      XYZ_PREVIEW_CONTENT,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export-preview',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          filetype: 'xyz',
        }),
      },
    );
  });

  it('shows loading state while requesting XYZ preview', async () => {
    let resolvePreview: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolvePreview = resolve;
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    expect(
      screen.getByRole('button', { name: 'Previewing XYZ Export...' }),
    ).toBeDisabled();

    await act(async () => {
      resolvePreview(
        jsonResponse({
          filename: 'water.xyz',
          filetype: 'xyz',
          content: XYZ_PREVIEW_CONTENT,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Preview XYZ Export' }),
      ).toBeEnabled();
    });
  });

  it('shows backend export preview errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonErrorResponse({
        detail: "Export preview filetype 'xyz' failed.",
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Export preview error: Export preview filetype 'xyz' failed.",
      );
    });
    expect(
      screen.queryByLabelText('XYZ export preview'),
    ).not.toBeInTheDocument();
  });

  it('clears preview state when the molecule document changes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    const { rerender } = render(
      <MoleculeExportPreviewPanel document={WATER_DOCUMENT} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
        XYZ_PREVIEW_CONTENT,
      );
    });

    rerender(<MoleculeExportPreviewPanel document={HELIUM_DOCUMENT} />);

    expect(
      screen.queryByLabelText('XYZ export preview'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('water.xyz')).not.toBeInTheDocument();
  });
});
