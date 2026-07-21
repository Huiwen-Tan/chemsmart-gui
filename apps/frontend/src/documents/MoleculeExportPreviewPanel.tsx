import { useEffect, useMemo, useRef, useState } from 'react';

import { previewMoleculeExport } from '../api/client';
import type {
  MoleculeDocument,
  MoleculeExportPreviewFiletype,
  MoleculeExportPreviewResponse,
} from '../shared/types';

interface MoleculeExportPreviewPanelProps {
  document: MoleculeDocument | null;
}

interface ExportFormatOption {
  filetype: MoleculeExportPreviewFiletype;
  label: string;
  previewButtonLabel: string;
  previewingButtonLabel: string;
  downloadButtonLabel: string;
  previewAriaLabel: string;
  contentType: string;
}

const XYZ_EXPORT_OPTION: ExportFormatOption = {
  filetype: 'xyz',
  label: 'XYZ coordinates (.xyz)',
  previewButtonLabel: 'Preview XYZ Export',
  previewingButtonLabel: 'Previewing XYZ Export...',
  downloadButtonLabel: 'Download XYZ Export',
  previewAriaLabel: 'XYZ export preview',
  contentType: 'chemical/x-xyz;charset=utf-8',
};

const GJF_EXPORT_OPTION: ExportFormatOption = {
  filetype: 'gjf',
  label: 'Gaussian input (.gjf)',
  previewButtonLabel: 'Preview Gaussian Input',
  previewingButtonLabel: 'Previewing Gaussian Input...',
  downloadButtonLabel: 'Download Gaussian Input',
  previewAriaLabel: 'GJF export preview',
  contentType: 'text/plain;charset=utf-8',
};

const INP_EXPORT_OPTION: ExportFormatOption = {
  filetype: 'inp',
  label: 'ORCA input (.inp)',
  previewButtonLabel: 'Preview ORCA Input',
  previewingButtonLabel: 'Previewing ORCA Input...',
  downloadButtonLabel: 'Download ORCA Input',
  previewAriaLabel: 'INP export preview',
  contentType: 'text/plain;charset=utf-8',
};

function exportFormatsForDocument(
  document: MoleculeDocument | null,
): ExportFormatOption[] {
  const sourceFiletype = document?.source?.filetype.toLowerCase();
  const options = [XYZ_EXPORT_OPTION];

  if (sourceFiletype === 'com' || sourceFiletype === 'gjf') {
    options.push(GJF_EXPORT_OPTION);
  }
  if (sourceFiletype === 'inp') {
    options.push(INP_EXPORT_OPTION);
  }

  return options;
}

function exportFormatOptionForFiletype(
  filetype: MoleculeExportPreviewFiletype,
): ExportFormatOption {
  if (filetype === 'gjf') {
    return GJF_EXPORT_OPTION;
  }
  if (filetype === 'inp') {
    return INP_EXPORT_OPTION;
  }
  return XYZ_EXPORT_OPTION;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function downloadTextFile(
  filename: string,
  content: string,
  contentType: string,
): void {
  const blob = new Blob([content], {
    type: contentType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.rel = 'noopener';

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function MoleculeExportPreviewPanel({
  document,
}: MoleculeExportPreviewPanelProps): JSX.Element {
  const requestVersion = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] =
    useState<MoleculeExportPreviewResponse | null>(null);
  const [selectedFiletype, setSelectedFiletype] =
    useState<MoleculeExportPreviewFiletype>('xyz');
  const exportFormatOptions = useMemo(
    () => exportFormatsForDocument(document),
    [document],
  );
  const selectedOption =
    exportFormatOptions.find(
      (option) => option.filetype === selectedFiletype,
    ) ?? exportFormatOptions[0];

  useEffect(() => {
    if (
      !exportFormatOptions.some(
        (option) => option.filetype === selectedFiletype,
      )
    ) {
      setSelectedFiletype(exportFormatOptions[0].filetype);
    }
  }, [exportFormatOptions, selectedFiletype]);

  useEffect(() => {
    requestVersion.current += 1;
    setError(null);
    setIsPreviewing(false);
    setPreview(null);
  }, [document, selectedFiletype]);

  const previewSelectedExport = async (): Promise<void> => {
    if (!document) {
      setError('No molecule document is loaded.');
      return;
    }

    const activeRequestVersion = requestVersion.current + 1;
    requestVersion.current = activeRequestVersion;
    setError(null);
    setIsPreviewing(true);
    setPreview(null);

    try {
      const response = await previewMoleculeExport({
        document,
        filetype: selectedOption.filetype,
      });
      if (requestVersion.current === activeRequestVersion) {
        setPreview(response);
      }
    } catch (err: unknown) {
      if (requestVersion.current === activeRequestVersion) {
        setError(messageFromUnknownError(err));
      }
    } finally {
      if (requestVersion.current === activeRequestVersion) {
        setIsPreviewing(false);
      }
    }
  };

  return (
    <section
      aria-labelledby="molecule-export-preview-heading"
      style={{ marginTop: 16 }}
    >
      <h2 id="molecule-export-preview-heading">Export Preview</h2>
      <p>
        Preview backend-generated export content before write-back behavior.
      </p>
      <label htmlFor="molecule-export-preview-filetype">
        Format
        <select
          disabled={!document || isPreviewing}
          id="molecule-export-preview-filetype"
          onChange={(event) => {
            setSelectedFiletype(
              event.currentTarget.value as MoleculeExportPreviewFiletype,
            );
          }}
          style={{ marginLeft: 6 }}
          value={selectedOption.filetype}
        >
          {exportFormatOptions.map((option) => (
            <option key={option.filetype} value={option.filetype}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!document || isPreviewing}
        onClick={() => {
          void previewSelectedExport();
        }}
        style={{ marginLeft: 12 }}
        type="button"
      >
        {isPreviewing
          ? selectedOption.previewingButtonLabel
          : selectedOption.previewButtonLabel}
      </button>
      {!document ? <p>No molecule document loaded.</p> : null}
      {error ? (
        <p role="alert" style={{ color: '#ff8080' }}>
          Export preview error: {error}
        </p>
      ) : null}
      {preview ? (
        <div style={{ marginTop: 12 }}>
          <p>
            Suggested filename: <strong>{preview.filename}</strong>
          </p>
          <p>
            Filetype: <strong>{preview.filetype}</strong>
          </p>
          <button
            onClick={() => {
              const previewOption = exportFormatOptionForFiletype(
                preview.filetype,
              );
              downloadTextFile(
                preview.filename,
                preview.content,
                previewOption.contentType,
              );
            }}
            type="button"
          >
            {exportFormatOptionForFiletype(preview.filetype)
              .downloadButtonLabel}
          </button>
          <pre
            aria-label={
              exportFormatOptionForFiletype(preview.filetype).previewAriaLabel
            }
            style={{
              maxHeight: 240,
              overflow: 'auto',
              padding: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {preview.content}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
