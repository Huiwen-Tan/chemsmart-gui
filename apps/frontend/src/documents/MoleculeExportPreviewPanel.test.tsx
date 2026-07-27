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
  frozen_atom_indices: [],
  vibrational_modes: [],
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

const GAUSSIAN_COM_DOCUMENT: MoleculeDocument = {
  ...GAUSSIAN_DOCUMENT,
  id: 'gaussian-com-water-document',
  source: {
    path: 'sample-data/water.com',
    filename: 'water.com',
    filetype: 'com',
  },
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

const LOG_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'gaussian-log-document',
  source: {
    path: 'sample-data/water.log',
    filename: 'water.log',
    filetype: 'log',
  },
  calculation: {
    program: 'gaussian',
    normal_termination: true,
  },
};

const SOURCE_WRITTEN_WATER_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
    size_bytes: 128,
    modified_time_ns: 123,
  },
};

const CURRENT_SOURCE_STATUS_RESPONSE = {
  status: 'current',
  message: 'Source file matches the opened revision.',
  opened_source: WATER_DOCUMENT.source,
  current_source: SOURCE_WRITTEN_WATER_DOCUMENT.source,
};

const XYZ_PREVIEW_CONTENT =
  '2\nwater.xyz    Empirical formula: H2O\nO 0 0 0\nH 1 1 1\n';
const GJF_PREVIEW_CONTENT =
  '%chk=water.chk\n%nprocshared=1\n%mem=1GB\n# hf/sto-3g opt\n\nwater\n\n0 1\nO 0 0 0\n';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonErrorResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 400,
    statusText: 'Bad Request',
    headers: { 'Content-Type': 'application/json' },
  });
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Could not read Blob.'));
    });
    reader.readAsText(blob);
  });
}

function openSourceFileActions(): void {
  fireEvent.click(screen.getByText('Source File Actions'));
}

describe('MoleculeExportPreviewPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    delete window.chemsmartDesktop;
  });

  afterEach(() => {
    cleanup();
    delete window.chemsmartDesktop;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disables export actions when no molecule document is loaded', () => {
    render(<MoleculeExportPreviewPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Export Options' });
    expect(within(panel).getByRole('combobox', { name: 'File type' }))
      .toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Preview XYZ Export' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Download Export' }),
    ).toBeDisabled();
    expect(within(panel).getByText('No molecule document loaded.'))
      .toBeInTheDocument();
    expect(within(panel).queryByText('Source File Actions'))
      .not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers only formats that the backend can derive from the source', () => {
    const { rerender } = render(
      <MoleculeExportPreviewPanel document={WATER_DOCUMENT} />,
    );

    const optionLabels = (): Array<string | null> => (
      within(screen.getByRole('combobox', { name: 'File type' }))
        .getAllByRole('option')
        .map((option) => option.textContent)
    );

    expect(optionLabels()).toEqual(['XYZ coordinates (.xyz)']);

    rerender(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);
    expect(optionLabels()).toEqual([
      'XYZ coordinates (.xyz)',
      'Gaussian input (.gjf)',
      'Gaussian input (.com)',
    ]);

    rerender(<MoleculeExportPreviewPanel document={GAUSSIAN_COM_DOCUMENT} />);
    expect(optionLabels()).toEqual([
      'XYZ coordinates (.xyz)',
      'Gaussian input (.com)',
      'Gaussian input (.gjf)',
    ]);

    rerender(<MoleculeExportPreviewPanel document={ORCA_DOCUMENT} />);
    expect(optionLabels()).toEqual([
      'XYZ coordinates (.xyz)',
      'ORCA input (.inp)',
    ]);
  });

  it('previews backend-generated export content', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.gjf',
        filetype: 'gjf',
        content: GJF_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'File type' }), {
      target: { value: 'gjf' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview Gaussian Input' }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('GJF export preview').textContent).toBe(
        GJF_PREVIEW_CONTENT,
      );
    });
    expect(screen.getByText('water.gjf · GJF')).toBeInTheDocument();
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

  it('downloads backend-generated content in browser development', async () => {
    const createObjectURL = vi.fn((blob: Blob): string => {
      void blob;
      return 'blob:water-xyz-export';
    });
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download Export' }));

    await waitFor(() => {
      expect(
        screen.getByText((_, element) => (
          element?.textContent === 'Downloaded water.xyz.'
        )),
      ).toBeInTheDocument();
    });
    const blob = createObjectURL.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) {
      throw new Error('Expected an XYZ export Blob.');
    }
    expect(blob.type).toBe('chemical/x-xyz;charset=utf-8');
    await expect(readBlobAsText(blob)).resolves.toBe(XYZ_PREVIEW_CONTENT);
    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('water.xyz');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:water-xyz-export');
  });

  it('uses the desktop Save As bridge for arbitrary local paths', async () => {
    const saveTextFile = vi.fn().mockResolvedValue({
      filename: 'saved-water.xyz',
      filetype: 'xyz',
      path: '/Users/example/Documents/saved-water.xyz',
      bytes_written: 64,
    });
    Object.defineProperty(window, 'chemsmartDesktop', {
      configurable: true,
      value: {
        backendBaseUrl: 'http://127.0.0.1:8000',
        saveTextFile,
      },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

    await waitFor(() => {
      expect(screen.getByText('/Users/example/Documents/saved-water.xyz'))
        .toBeInTheDocument();
    });
    expect(saveTextFile).toHaveBeenCalledWith({
      content: XYZ_PREVIEW_CONTENT,
      defaultFilename: 'water.xyz',
      filetype: 'xyz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('regenerates export content before saving an existing preview', async () => {
    const saveTextFile = vi.fn().mockResolvedValue(null);
    Object.defineProperty(window, 'chemsmartDesktop', {
      configurable: true,
      value: {
        backendBaseUrl: 'http://127.0.0.1:8000',
        saveTextFile,
      },
    });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water.xyz',
          filetype: 'xyz',
          content: 'old coordinates',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          filename: 'water.xyz',
          filetype: 'xyz',
          content: 'current coordinates',
        }),
      );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
        'old coordinates',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

    await waitFor(() => expect(saveTextFile).toHaveBeenCalledOnce());
    expect(saveTextFile).toHaveBeenCalledWith({
      content: 'current coordinates',
      defaultFilename: 'water.xyz',
      filetype: 'xyz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats canceling the desktop Save As dialog as a no-op', async () => {
    const saveTextFile = vi.fn().mockResolvedValue(null);
    Object.defineProperty(window, 'chemsmartDesktop', {
      configurable: true,
      value: {
        backendBaseUrl: 'http://127.0.0.1:8000',
        saveTextFile,
      },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

    await waitFor(() => expect(saveTextFile).toHaveBeenCalledOnce());
    expect(screen.queryByText(/^Saved /)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows desktop save errors without clearing the preview', async () => {
    const saveTextFile = vi.fn().mockRejectedValue(
      new Error('Could not write the selected file.'),
    );
    Object.defineProperty(window, 'chemsmartDesktop', {
      configurable: true,
      value: {
        backendBaseUrl: 'http://127.0.0.1:8000',
        saveTextFile,
      },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );

    render(<MoleculeExportPreviewPanel document={WATER_DOCUMENT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Export save error: Could not write the selected file.',
      );
    });
    expect(screen.getByLabelText('XYZ export preview').textContent).toBe(
      XYZ_PREVIEW_CONTENT,
    );
  });

  it('shows preview loading and backend error states', async () => {
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
      resolvePreview(jsonErrorResponse({ detail: 'Preview failed.' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Export preview error: Preview failed.',
      );
    });
  });

  it('clears preview state when the document or format changes', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        filename: 'water.xyz',
        filetype: 'xyz',
        content: XYZ_PREVIEW_CONTENT,
      }),
    );
    const { rerender } = render(
      <MoleculeExportPreviewPanel document={GAUSSIAN_DOCUMENT} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview XYZ Export' }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText('XYZ export preview')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox', { name: 'File type' }), {
      target: { value: 'gjf' },
    });
    expect(screen.queryByLabelText('XYZ export preview'))
      .not.toBeInTheDocument();

    rerender(<MoleculeExportPreviewPanel document={HELIUM_DOCUMENT} />);
    expect(screen.queryByText('water.xyz · XYZ')).not.toBeInTheDocument();
  });

  it('keeps source write-back available under Source File Actions', async () => {
    const onSourceWrite = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(CURRENT_SOURCE_STATUS_RESPONSE))
      .mockResolvedValueOnce(
        jsonResponse({
          document: SOURCE_WRITTEN_WATER_DOCUMENT,
          filename: 'water.xyz',
          filetype: 'xyz',
          path: 'sample-data/water.xyz',
          bytes_written: 128,
        }),
      );

    render(
      <MoleculeExportPreviewPanel
        document={WATER_DOCUMENT}
        onSourceWrite={onSourceWrite}
      />,
    );
    expect(screen.getByText('Source File Actions').closest('details'))
      .not.toHaveAttribute('open');
    openSourceFileActions();
    fireEvent.click(
      screen.getByRole('button', { name: 'Update Source File' }),
    );

    await waitFor(() => {
      expect(screen.getByText('sample-data/water.xyz')).toBeInTheDocument();
    });
    expect(onSourceWrite).toHaveBeenCalledWith(SOURCE_WRITTEN_WATER_DOCUMENT);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('blocks changed source write-back and offers reopening', async () => {
    const onReopenSource = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...CURRENT_SOURCE_STATUS_RESPONSE,
        status: 'changed',
        message: 'Source file changed since this document was opened.',
      }),
    );

    render(
      <MoleculeExportPreviewPanel
        document={WATER_DOCUMENT}
        onReopenSource={onReopenSource}
      />,
    );
    openSourceFileActions();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check Source Status' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Source status: Changed. Source file changed since this document was opened.',
      );
    });
    expect(screen.getByRole('button', { name: 'Update Source File' }))
      .toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reopen Source File' }),
    );
    expect(onReopenSource).toHaveBeenCalledWith('sample-data/water.xyz');
  });

  it('shows unsupported source write-back only inside advanced actions', () => {
    render(<MoleculeExportPreviewPanel document={LOG_DOCUMENT} />);

    expect(screen.getByText('Source File Actions').closest('details'))
      .not.toHaveAttribute('open');
    openSourceFileActions();
    expect(
      screen.getByText('Source write-back is not supported for this document.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Source File' }))
      .toBeDisabled();
  });
});
