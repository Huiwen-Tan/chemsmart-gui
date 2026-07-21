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

const GAUSSIAN_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'gaussian-water-document',
  source: {
    path: 'sample-data/water.gjf',
    filename: 'water.gjf',
    filetype: 'gjf',
  },
  charge: 0,
  multiplicity: 1,
};

const ORCA_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'orca-water-document',
  source: {
    path: 'sample-data/water.inp',
    filename: 'water.inp',
    filetype: 'inp',
  },
  charge: 0,
  multiplicity: 1,
};

const XYZ_PREVIEW_CONTENT =
  '2\nwater.xyz    Empirical formula: H2O\nO 0 0 0\nH 1 1 1\n';
const GJF_PREVIEW_CONTENT =
  '%chk=water.chk\n%nprocshared=1\n%mem=1GB\n# hf/sto-3g opt\n\nwater\n\n0 1\nO 0 0 0\n';
const INP_PREVIEW_CONTENT =
  '! hf def2-svp\n# Number of processors\n%pal nprocs 1 end\n* xyz 0 1\nO 0 0 0\n*\n';

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

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(String(reader.result));
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Could not read Blob.'));
    });
    reader.readAsText(blob);
  });
}

describe('MoleculeExportPreviewPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disables XYZ preview when no molecule document is loaded', () => {
    render(<MoleculeExportPreviewPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Export Preview' });
    expect(within(panel).getByRole('combobox', { name: 'Format' }))
      .toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Preview XYZ Export' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('textbox', { name: 'Backend target path' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Save Export' }),
    ).toBeDisabled();
    expect(
      within(panel).getByText('No molecule document loaded.'),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: 'Download XYZ Export' }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers only XYZ export for pure coordinate documents', () => {
    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    const formatSelector = screen.getByRole('combobox', { name: 'Format' });

    expect(
      within(formatSelector).getAllByRole('option').map(
        (option) => option.textContent,
      ),
    ).toEqual(['XYZ coordinates (.xyz)']);
  });

  it('offers Gaussian input preview for Gaussian input documents', () => {
    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    const formatSelector = screen.getByRole('combobox', { name: 'Format' });

    expect(
      within(formatSelector).getAllByRole('option').map(
        (option) => option.textContent,
      ),
    ).toEqual(['XYZ coordinates (.xyz)', 'Gaussian input (.gjf)']);
  });

  it('offers ORCA input preview for ORCA input documents', () => {
    render(<MoleculeExportPreviewPanel document={ORCA_DOCUMENT} />);

    const formatSelector = screen.getByRole('combobox', { name: 'Format' });

    expect(
      within(formatSelector).getAllByRole('option').map(
        (option) => option.textContent,
      ),
    ).toEqual(['XYZ coordinates (.xyz)', 'ORCA input (.inp)']);
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
    expect(
      screen.getByRole('button', { name: 'Download XYZ Export' }),
    ).toBeEnabled();
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

  it('previews backend-generated Gaussian input content', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.gjf',
        filetype: 'gjf',
        content: GJF_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview Gaussian Input' }),
    );

    await waitFor(() => {
      expect(screen.getByText('water.gjf')).toBeInTheDocument();
    });
    expect(screen.getByText('gjf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download Gaussian Input' }),
    ).toBeEnabled();
    expect(screen.getByLabelText('GJF export preview').textContent).toBe(
      GJF_PREVIEW_CONTENT,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export-preview',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: GAUSSIAN_DOCUMENT,
          filetype: 'gjf',
        }),
      },
    );
  });

  it('previews backend-generated ORCA input content', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.inp',
        filetype: 'inp',
        content: INP_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={ORCA_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'inp' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview ORCA Input' }),
    );

    await waitFor(() => {
      expect(screen.getByText('water.inp')).toBeInTheDocument();
    });
    expect(screen.getByText('inp')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download ORCA Input' }),
    ).toBeEnabled();
    expect(screen.getByLabelText('INP export preview').textContent).toBe(
      INP_PREVIEW_CONTENT,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export-preview',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: ORCA_DOCUMENT,
          filetype: 'inp',
        }),
      },
    );
  });

  it('downloads the backend-generated XYZ preview content', async () => {
    const createObjectURL = vi.fn((blob: Blob): string => {
      void blob;
      return 'blob:water-xyz-preview';
    });
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    expect(
      screen.queryByRole('button', { name: 'Download XYZ Export' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download XYZ Export' }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Download XYZ Export' }),
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) {
      throw new Error('Expected an XYZ export Blob.');
    }
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('chemical/x-xyz;charset=utf-8');
    await expect(readBlobAsText(blob)).resolves.toBe(XYZ_PREVIEW_CONTENT);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('water.xyz');
    expect(link.href).toBe('blob:water-xyz-preview');
    expect(link.rel).toBe('noopener');
    expect(document.body.contains(link)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:water-xyz-preview');
  });

  it('downloads the selected Gaussian preview content', async () => {
    const createObjectURL = vi.fn((blob: Blob): string => {
      void blob;
      return 'blob:water-gjf-preview';
    });
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.gjf',
        filetype: 'gjf',
        content: GJF_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview Gaussian Input' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download Gaussian Input' }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Download Gaussian Input' }),
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) {
      throw new Error('Expected a Gaussian input export Blob.');
    }
    expect(blob.type).toBe('text/plain;charset=utf-8');
    await expect(readBlobAsText(blob)).resolves.toBe(GJF_PREVIEW_CONTENT);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('water.gjf');
    expect(link.href).toBe('blob:water-gjf-preview');
    expect(link.rel).toBe('noopener');
    expect(document.body.contains(link)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:water-gjf-preview');
  });

  it('saves the selected XYZ export to a backend target path', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water-copy.xyz',
        filetype: 'xyz',
        path: '/tmp/water-copy.xyz',
        bytes_written: 128,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water-copy.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/water-copy.xyz')).toBeInTheDocument();
    });
    expect(
      screen.getByText((content) => content.includes('128 bytes')),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: WATER_DOCUMENT,
          filetype: 'xyz',
          target_path: '/tmp/water-copy.xyz',
        }),
      },
    );
  });

  it('saves the selected Gaussian input export', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.gjf',
        filetype: 'gjf',
        path: '/tmp/water.gjf',
        bytes_written: 256,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });
    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water.gjf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/water.gjf')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/documents/export',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          document: GAUSSIAN_DOCUMENT,
          filetype: 'gjf',
          target_path: '/tmp/water.gjf',
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

  it('shows loading state while requesting Gaussian preview', async () => {
    let resolvePreview: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolvePreview = resolve;
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview Gaussian Input' }),
    );

    expect(
      screen.getByRole('button', { name: 'Previewing Gaussian Input...' }),
    ).toBeDisabled();

    await act(async () => {
      resolvePreview(
        jsonResponse({
          filename: 'water.gjf',
          filetype: 'gjf',
          content: GJF_PREVIEW_CONTENT,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Preview Gaussian Input' }),
      ).toBeEnabled();
    });
  });

  it('shows loading state while saving an export', async () => {
    let resolveSave: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSave = resolve;
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water-copy.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    expect(
      screen.getByRole('button', { name: 'Saving Export...' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    ).toBeDisabled();

    await act(async () => {
      resolveSave(
        jsonResponse({
          filename: 'water-copy.xyz',
          filetype: 'xyz',
          path: '/tmp/water-copy.xyz',
          bytes_written: 128,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save Export' }),
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

  it('shows backend export save errors without clearing preview content', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water.xyz',
          filetype: 'xyz',
          content: XYZ_PREVIEW_CONTENT,
        }),
      )
      .mockResolvedValueOnce(
        jsonErrorResponse(
          {
            detail: 'Export target already exists: /tmp/water.xyz',
          },
          { status: 409, statusText: 'Conflict' },
        ),
      );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
        XYZ_PREVIEW_CONTENT,
      );
    });
    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Export save error: Export target already exists: /tmp/water.xyz',
      );
    });
    expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
      XYZ_PREVIEW_CONTENT,
    );
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

  it('clears save state when the molecule document changes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water-copy.xyz',
        filetype: 'xyz',
        path: '/tmp/water-copy.xyz',
        bytes_written: 128,
      }),
    );

    const { rerender } = render(
      <MoleculeExportPreviewPanel document={WATER_DOCUMENT} />,
    );

    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water-copy.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/water-copy.xyz')).toBeInTheDocument();
    });

    rerender(<MoleculeExportPreviewPanel document={HELIUM_DOCUMENT} />);

    expect(screen.queryByText('/tmp/water-copy.xyz')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Backend target path')).toHaveValue('');
  });

  it('clears preview state when the selected format changes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
        XYZ_PREVIEW_CONTENT,
      );
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });

    expect(
      screen.queryByLabelText('XYZ export preview'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('water.xyz')).not.toBeInTheDocument();
  });

  it('clears save state when the selected format changes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        path: '/tmp/water.xyz',
        bytes_written: 128,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByLabelText('Backend target path'), {
      target: { value: '/tmp/water.xyz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Export' }));

    await waitFor(() => {
      expect(screen.getByText('/tmp/water.xyz')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'Format' }), {
      target: { value: 'gjf' },
    });

    expect(screen.queryByText('/tmp/water.xyz')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Backend target path')).toHaveValue('');
  });
});
