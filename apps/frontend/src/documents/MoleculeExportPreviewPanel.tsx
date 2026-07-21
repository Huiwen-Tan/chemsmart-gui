import { useEffect, useMemo, useRef, useState } from 'react';

import { previewMoleculeExport, writeMoleculeExport } from '../api/client';
import type {
  MoleculeDocument,
  MoleculeExportPreviewFiletype,
  MoleculeExportPreviewResponse,
  MoleculeExportWriteResponse,
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
  const previewRequestVersion = useRef(0);
  const saveRequestVersion = useRef(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] =
    useState<MoleculeExportPreviewResponse | null>(null);
  const [savedExport, setSavedExport] =
    useState<MoleculeExportWriteResponse | null>(null);
  const [saveTargetPath, setSaveTargetPath] = useState('');
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
  const isBusy = isPreviewing || isSaving;

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
    previewRequestVersion.current += 1;
    saveRequestVersion.current += 1;
    setPreviewError(null);
    setSaveError(null);
    setIsPreviewing(false);
    setIsSaving(false);
    setPreview(null);
    setSavedExport(null);
    setSaveTargetPath('');
  }, [document, selectedFiletype]);

  const previewSelectedExport = async (): Promise<void> => {
    if (!document) {
      setPreviewError('No molecule document is loaded.');
      return;
    }

    const activeRequestVersion = previewRequestVersion.current + 1;
    previewRequestVersion.current = activeRequestVersion;
    setPreviewError(null);
    setIsPreviewing(true);
    setPreview(null);

    try {
      const response = await previewMoleculeExport({
        document,
        filetype: selectedOption.filetype,
      });
      if (previewRequestVersion.current === activeRequestVersion) {
        setPreview(response);
      }
    } catch (err: unknown) {
      if (previewRequestVersion.current === activeRequestVersion) {
        setPreviewError(messageFromUnknownError(err));
      }
    } finally {
      if (previewRequestVersion.current === activeRequestVersion) {
        setIsPreviewing(false);
      }
    }
  };

  const saveSelectedExport = async (): Promise<void> => {
    if (!document) {
      setSaveError('No molecule document is loaded.');
      return;
    }

    const targetPath = saveTargetPath.trim();
    if (!targetPath) {
      setSaveError('A backend target path is required.');
      return;
    }

    const activeRequestVersion = saveRequestVersion.current + 1;
    saveRequestVersion.current = activeRequestVersion;
    setSaveError(null);
    setIsSaving(true);
    setSavedExport(null);

    try {
      const response = await writeMoleculeExport({
        document,
        filetype: selectedOption.filetype,
        target_path: targetPath,
      });
      if (saveRequestVersion.current === activeRequestVersion) {
        setSavedExport(response);
      }
    } catch (err: unknown) {
      if (saveRequestVersion.current === activeRequestVersion) {
        setSaveError(messageFromUnknownError(err));
      }
    } finally {
      if (saveRequestVersion.current === activeRequestVersion) {
        setIsSaving(false);
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
          disabled={!document || isBusy}
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
        disabled={!document || isBusy}
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
      <div style={{ marginTop: 12 }}>
        <p>
          Save generated export content to a backend-accessible path. Existing
          files are refused by the backend.
        </p>
        <label htmlFor="molecule-export-target-path">
          Backend target path
          <input
            disabled={!document || isBusy}
            id="molecule-export-target-path"
            onChange={(event) => {
              setSaveTargetPath(event.currentTarget.value);
              setSaveError(null);
              setSavedExport(null);
            }}
            placeholder={`/tmp/molecule.${selectedOption.filetype}`}
            style={{ marginLeft: 6, minWidth: 280 }}
            type="text"
            value={saveTargetPath}
          />
        </label>
        <button
          disabled={!document || isBusy || saveTargetPath.trim().length === 0}
          onClick={() => {
            void saveSelectedExport();
          }}
          style={{ marginLeft: 12 }}
          type="button"
        >
          {isSaving ? 'Saving Export...' : 'Save Export'}
        </button>
      </div>
      {!document ? <p>No molecule document loaded.</p> : null}
      {previewError ? (
        <p role="alert" style={{ color: '#ff8080' }}>
          Export preview error: {previewError}
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" style={{ color: '#ff8080' }}>
          Export save error: {saveError}
        </p>
      ) : null}
      {savedExport ? (
        <p aria-live="polite">
          Saved export to <strong>{savedExport.path}</strong> (
          {savedExport.bytes_written} bytes).
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
