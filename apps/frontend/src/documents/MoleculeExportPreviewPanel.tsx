import { useEffect, useMemo, useRef, useState } from 'react';

import {
  checkMoleculeSourceStatus,
  previewMoleculeExport,
  writeMoleculeSource,
} from '../api/client';
import { downloadTextFile } from '../shared/download';
import type {
  MoleculeDocument,
  MoleculeExportPreviewFiletype,
  MoleculeExportPreviewResponse,
  MoleculeExportWriteResponse,
  MoleculeSourceStatusResponse,
  MoleculeSourceStatusValue,
  MoleculeSourceWriteFiletype,
  MoleculeSourceWriteResponse,
} from '../shared/types';

interface MoleculeExportPreviewPanelProps {
  document: MoleculeDocument | null;
  onReopenSource?: (sourcePath: string) => Promise<void> | void;
  onSourceWrite?: (document: MoleculeDocument) => void;
}

interface ExportFormatOption {
  contentType: string;
  filetype: MoleculeExportPreviewFiletype;
  label: string;
  previewAriaLabel: string;
  previewButtonLabel: string;
  previewingButtonLabel: string;
}

const XYZ_EXPORT_OPTION: ExportFormatOption = {
  contentType: 'chemical/x-xyz;charset=utf-8',
  filetype: 'xyz',
  label: 'XYZ coordinates (.xyz)',
  previewAriaLabel: 'XYZ export preview',
  previewButtonLabel: 'Preview XYZ Export',
  previewingButtonLabel: 'Previewing XYZ Export...',
};

const COM_EXPORT_OPTION: ExportFormatOption = {
  contentType: 'text/plain;charset=utf-8',
  filetype: 'com',
  label: 'Gaussian input (.com)',
  previewAriaLabel: 'COM export preview',
  previewButtonLabel: 'Preview Gaussian Input',
  previewingButtonLabel: 'Previewing Gaussian Input...',
};

const GJF_EXPORT_OPTION: ExportFormatOption = {
  contentType: 'text/plain;charset=utf-8',
  filetype: 'gjf',
  label: 'Gaussian input (.gjf)',
  previewAriaLabel: 'GJF export preview',
  previewButtonLabel: 'Preview Gaussian Input',
  previewingButtonLabel: 'Previewing Gaussian Input...',
};

const INP_EXPORT_OPTION: ExportFormatOption = {
  contentType: 'text/plain;charset=utf-8',
  filetype: 'inp',
  label: 'ORCA input (.inp)',
  previewAriaLabel: 'INP export preview',
  previewButtonLabel: 'Preview ORCA Input',
  previewingButtonLabel: 'Previewing ORCA Input...',
};

const SOURCE_WRITE_FILETYPES = new Set(['xyz', 'com', 'gjf', 'inp']);

function exportFormatsForDocument(
  document: MoleculeDocument | null,
): ExportFormatOption[] {
  const sourceFiletype = document?.source?.filetype.toLowerCase();
  const options = [XYZ_EXPORT_OPTION];

  if (sourceFiletype === 'com') {
    options.push(COM_EXPORT_OPTION, GJF_EXPORT_OPTION);
  }
  if (sourceFiletype === 'gjf') {
    options.push(GJF_EXPORT_OPTION, COM_EXPORT_OPTION);
  }
  if (sourceFiletype === 'inp') {
    options.push(INP_EXPORT_OPTION);
  }

  return options;
}

function exportFormatOptionForFiletype(
  filetype: MoleculeExportPreviewFiletype,
): ExportFormatOption {
  if (filetype === 'com') {
    return COM_EXPORT_OPTION;
  }
  if (filetype === 'gjf') {
    return GJF_EXPORT_OPTION;
  }
  if (filetype === 'inp') {
    return INP_EXPORT_OPTION;
  }
  return XYZ_EXPORT_OPTION;
}

function sourceWriteFiletypeForDocument(
  document: MoleculeDocument | null,
): MoleculeSourceWriteFiletype | null {
  const sourceFiletype = document?.source?.filetype.toLowerCase();
  if (!sourceFiletype || !SOURCE_WRITE_FILETYPES.has(sourceFiletype)) {
    return null;
  }
  return sourceFiletype as MoleculeSourceWriteFiletype;
}

function sourceStatusLabel(status: MoleculeSourceStatusValue): string {
  if (status === 'current') {
    return 'Current';
  }
  if (status === 'changed') {
    return 'Changed';
  }
  if (status === 'missing') {
    return 'Missing';
  }
  return 'Untracked';
}

function sourceStatusResolutionMessage(
  status: MoleculeSourceStatusValue,
): string | null {
  if (status === 'changed' || status === 'untracked') {
    return 'Reopen the source file before writing back.';
  }
  if (status === 'missing') {
    return 'Restore the source file or open a different file before writing back.';
  }
  return null;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function MoleculeExportPreviewPanel({
  document,
  onReopenSource,
  onSourceWrite,
}: MoleculeExportPreviewPanelProps): JSX.Element {
  const previewRequestVersion = useRef(0);
  const saveRequestVersion = useRef(0);
  const sourceStatusRequestVersion = useRef(0);
  const sourceWriteRequestVersion = useRef(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sourceStatusError, setSourceStatusError] = useState<string | null>(
    null,
  );
  const [sourceWriteError, setSourceWriteError] = useState<string | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSource, setIsCheckingSource] = useState(false);
  const [isReopeningSource, setIsReopeningSource] = useState(false);
  const [isWritingSource, setIsWritingSource] = useState(false);
  const [preview, setPreview] =
    useState<MoleculeExportPreviewResponse | null>(null);
  const [savedExport, setSavedExport] =
    useState<MoleculeExportWriteResponse | null>(null);
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(
    null,
  );
  const [sourceStatus, setSourceStatus] =
    useState<MoleculeSourceStatusResponse | null>(null);
  const [sourceWriteResult, setSourceWriteResult] =
    useState<MoleculeSourceWriteResponse | null>(null);
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
  const sourceWriteFiletype = sourceWriteFiletypeForDocument(document);
  const sourceWriteBlockedByStatus =
    sourceStatus !== null && sourceStatus.status !== 'current';
  const sourceStatusCanReopen =
    sourceStatus?.status === 'changed' || sourceStatus?.status === 'untracked';
  const canReopenSource = Boolean(
    sourceStatusCanReopen && document?.source?.path && onReopenSource,
  );
  const sourceResolutionMessage = sourceStatus
    ? sourceStatusResolutionMessage(sourceStatus.status)
    : null;
  const desktopSaveTextFile = window.chemsmartDesktop?.saveTextFile;
  const isDesktopSaveAvailable = Boolean(desktopSaveTextFile);
  const isBusy =
    isPreviewing ||
    isSaving ||
    isCheckingSource ||
    isReopeningSource ||
    isWritingSource;

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
    sourceStatusRequestVersion.current += 1;
    sourceWriteRequestVersion.current += 1;
    setPreviewError(null);
    setSaveError(null);
    setSourceStatusError(null);
    setSourceWriteError(null);
    setIsPreviewing(false);
    setIsSaving(false);
    setIsCheckingSource(false);
    setIsReopeningSource(false);
    setIsWritingSource(false);
    setPreview(null);
    setSavedExport(null);
    setDownloadedFilename(null);
    setSourceStatus(null);
    setSourceWriteResult(null);
  }, [document, selectedFiletype]);

  const previewSelectedExport =
    async (): Promise<MoleculeExportPreviewResponse | null> => {
      if (!document) {
        setPreviewError('No molecule document is loaded.');
        return null;
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
          return response;
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
      return null;
    };

  const saveSelectedExport = async (): Promise<void> => {
    if (!document) {
      setSaveError('No molecule document is loaded.');
      return;
    }

    const activeRequestVersion = saveRequestVersion.current + 1;
    saveRequestVersion.current = activeRequestVersion;
    setSaveError(null);
    setSavedExport(null);
    setDownloadedFilename(null);
    setIsSaving(true);

    try {
      const exportPreview = await previewSelectedExport();
      if (
        !exportPreview ||
        saveRequestVersion.current !== activeRequestVersion
      ) {
        return;
      }

      if (desktopSaveTextFile) {
        const response = await desktopSaveTextFile({
          content: exportPreview.content,
          defaultFilename: exportPreview.filename,
          filetype: exportPreview.filetype,
        });
        if (
          response &&
          saveRequestVersion.current === activeRequestVersion
        ) {
          setSavedExport(response);
        }
        return;
      }

      const previewOption = exportFormatOptionForFiletype(
        exportPreview.filetype,
      );
      downloadTextFile(
        exportPreview.filename,
        exportPreview.content,
        previewOption.contentType,
      );
      if (saveRequestVersion.current === activeRequestVersion) {
        setDownloadedFilename(exportPreview.filename);
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

  const loadSourceStatus =
    async (): Promise<MoleculeSourceStatusResponse | null> => {
      if (!document) {
        setSourceStatusError('No molecule document is loaded.');
        return null;
      }
      if (!document.source) {
        setSourceStatusError(
          'Source status requires an existing source file.',
        );
        return null;
      }

      const activeRequestVersion = sourceStatusRequestVersion.current + 1;
      sourceStatusRequestVersion.current = activeRequestVersion;
      setSourceStatusError(null);
      setSourceStatus(null);

      try {
        const response = await checkMoleculeSourceStatus({ document });
        if (sourceStatusRequestVersion.current === activeRequestVersion) {
          setSourceStatus(response);
          return response;
        }
      } catch (err: unknown) {
        if (sourceStatusRequestVersion.current === activeRequestVersion) {
          setSourceStatusError(messageFromUnknownError(err));
        }
      }
      return null;
    };

  const checkSourceStatus = async (): Promise<void> => {
    setIsCheckingSource(true);
    try {
      await loadSourceStatus();
    } finally {
      setIsCheckingSource(false);
    }
  };

  const reopenSource = async (): Promise<void> => {
    const sourcePath = document?.source?.path;
    if (!sourcePath || !onReopenSource) {
      setSourceStatusError('Source reopen requires an existing source file.');
      return;
    }

    setSourceStatusError(null);
    setIsReopeningSource(true);
    try {
      await onReopenSource(sourcePath);
    } catch (err: unknown) {
      setSourceStatusError(messageFromUnknownError(err));
    } finally {
      setIsReopeningSource(false);
    }
  };

  const writeBackToSource = async (): Promise<void> => {
    if (!document) {
      setSourceWriteError('No molecule document is loaded.');
      return;
    }
    if (!sourceWriteFiletype) {
      setSourceWriteError(
        'Source write-back is not supported for this document.',
      );
      return;
    }
    if (sourceWriteBlockedByStatus) {
      setSourceWriteError(
        'Resolve the source status before writing back to the source file.',
      );
      return;
    }
    const sourcePath = document.source?.path;
    if (!sourcePath) {
      setSourceWriteError('Source write-back requires an existing source.');
      return;
    }

    const activeRequestVersion = sourceWriteRequestVersion.current + 1;
    sourceWriteRequestVersion.current = activeRequestVersion;
    setSourceWriteError(null);
    setIsWritingSource(true);
    setSourceWriteResult(null);

    try {
      const preflightStatus = await loadSourceStatus();
      if (sourceWriteRequestVersion.current !== activeRequestVersion) {
        return;
      }
      if (!preflightStatus || preflightStatus.status !== 'current') {
        return;
      }

      const confirmed = window.confirm(
        [
          'Write current molecule edits back to the source file?',
          '',
          sourcePath,
          '',
          'This overwrites the source file after backend freshness checks.',
        ].join('\n'),
      );
      if (!confirmed) {
        return;
      }

      const response = await writeMoleculeSource({
        document,
        confirmed: true,
      });
      if (sourceWriteRequestVersion.current === activeRequestVersion) {
        const updatedSource = response.document.source;
        setSourceWriteResult(response);
        setSourceStatus(
          updatedSource
            ? {
                status: 'current',
                message: 'Source file matches the saved document.',
                opened_source: updatedSource,
                current_source: updatedSource,
              }
            : null,
        );
        onSourceWrite?.(response.document);
      }
    } catch (err: unknown) {
      if (sourceWriteRequestVersion.current === activeRequestVersion) {
        setSourceWriteError(messageFromUnknownError(err));
      }
    } finally {
      if (sourceWriteRequestVersion.current === activeRequestVersion) {
        setIsWritingSource(false);
      }
    }
  };

  return (
    <section aria-label="Export Options" className="workbench-export-panel">
      <div className="workbench-export-controls">
        <label className="workbench-field" htmlFor="molecule-export-filetype">
          <span className="workbench-field-label">File type</span>
          <select
            className="workbench-input"
            disabled={!document || isBusy}
            id="molecule-export-filetype"
            onChange={(event) => {
              setSelectedFiletype(
                event.currentTarget.value as MoleculeExportPreviewFiletype,
              );
            }}
            value={selectedOption.filetype}
          >
            {exportFormatOptions.map((option) => (
              <option key={option.filetype} value={option.filetype}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="workbench-export-actions">
          <button
            className="workbench-button"
            disabled={!document || isBusy}
            onClick={() => {
              void previewSelectedExport();
            }}
            type="button"
          >
            {isPreviewing
              ? selectedOption.previewingButtonLabel
              : selectedOption.previewButtonLabel}
          </button>
          <button
            className="workbench-button workbench-button-primary"
            disabled={!document || isBusy}
            onClick={() => {
              void saveSelectedExport();
            }}
            type="button"
          >
            {isSaving
              ? isDesktopSaveAvailable
                ? 'Saving...'
                : 'Preparing Download...'
              : isDesktopSaveAvailable
                ? 'Save As...'
                : 'Download Export'}
          </button>
        </div>
      </div>

      <p className="workbench-export-help">
        {isDesktopSaveAvailable
          ? 'Save As opens the system file dialog and writes to the location you choose.'
          : 'Browser development downloads the generated file. Desktop mode uses the system Save As dialog.'}
      </p>

      {!document ? <p>No molecule document loaded.</p> : null}
      {previewError ? (
        <p className="workbench-error" role="alert">
          Export preview error: {previewError}
        </p>
      ) : null}
      {saveError ? (
        <p className="workbench-error" role="alert">
          Export save error: {saveError}
        </p>
      ) : null}
      {savedExport ? (
        <p aria-live="polite" className="workbench-status-line">
          Saved <strong>{savedExport.filename}</strong> to{' '}
          <strong>{savedExport.path}</strong> ({savedExport.bytes_written} bytes).
        </p>
      ) : null}
      {downloadedFilename ? (
        <p aria-live="polite" className="workbench-status-line">
          Downloaded <strong>{downloadedFilename}</strong>.
        </p>
      ) : null}

      {preview ? (
        <section aria-label="Export Preview" className="workbench-result-section">
          <div className="workbench-export-preview-heading">
            <h3>Preview</h3>
            <span>
              {preview.filename} · {preview.filetype.toUpperCase()}
            </span>
          </div>
          <pre
            aria-label={
              exportFormatOptionForFiletype(preview.filetype).previewAriaLabel
            }
            className="workbench-code-preview workbench-export-preview-content"
          >
            {preview.content}
          </pre>
        </section>
      ) : null}

      {document?.source ? (
        <details className="workbench-export-source-actions">
          <summary>Source File Actions</summary>
          <div className="workbench-panel-stack">
            <p>
              Check the opened source revision before replacing the original
              file with current molecule edits.
            </p>
            <div className="workbench-export-actions">
              <button
                className="workbench-button"
                disabled={isBusy}
                onClick={() => {
                  void checkSourceStatus();
                }}
                type="button"
              >
                {isCheckingSource
                  ? 'Checking Source Status...'
                  : 'Check Source Status'}
              </button>
              <button
                className="workbench-button"
                disabled={
                  isBusy ||
                  !sourceWriteFiletype ||
                  sourceWriteBlockedByStatus
                }
                onClick={() => {
                  void writeBackToSource();
                }}
                type="button"
              >
                {isWritingSource
                  ? 'Updating Source File...'
                  : 'Update Source File'}
              </button>
              {canReopenSource ? (
                <button
                  className="workbench-button"
                  disabled={isBusy}
                  onClick={() => {
                    void reopenSource();
                  }}
                  type="button"
                >
                  {isReopeningSource
                    ? 'Reopening Source File...'
                    : 'Reopen Source File'}
                </button>
              ) : null}
            </div>
            {!sourceWriteFiletype ? (
              <p>Source write-back is not supported for this document.</p>
            ) : null}
            {sourceStatus ? (
              <p
                aria-live="polite"
                className="workbench-source-status"
                data-status={sourceStatus.status}
                role={sourceStatus.status === 'current' ? 'status' : 'alert'}
              >
                Source status:{' '}
                <strong>{sourceStatusLabel(sourceStatus.status)}</strong>.{' '}
                {sourceStatus.message}
              </p>
            ) : null}
            {sourceWriteBlockedByStatus ? (
              <p>{sourceResolutionMessage}</p>
            ) : null}
            {sourceStatusError ? (
              <p className="workbench-error" role="alert">
                Source status error: {sourceStatusError}
              </p>
            ) : null}
            {sourceWriteError ? (
              <p className="workbench-error" role="alert">
                Source write-back error: {sourceWriteError}
              </p>
            ) : null}
            {sourceWriteResult ? (
              <p aria-live="polite" className="workbench-status-line">
                Updated source file <strong>{sourceWriteResult.path}</strong> (
                {sourceWriteResult.bytes_written} bytes).
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}
