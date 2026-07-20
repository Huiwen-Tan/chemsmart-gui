import { useEffect, useRef, useState } from 'react';

import { previewMoleculeExport } from '../api/client';
import type {
  MoleculeDocument,
  MoleculeExportPreviewResponse,
} from '../shared/types';

interface MoleculeExportPreviewPanelProps {
  document: MoleculeDocument | null;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function MoleculeExportPreviewPanel({
  document,
}: MoleculeExportPreviewPanelProps): JSX.Element {
  const requestVersion = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] =
    useState<MoleculeExportPreviewResponse | null>(null);

  useEffect(() => {
    requestVersion.current += 1;
    setError(null);
    setIsPreviewing(false);
    setPreview(null);
  }, [document]);

  const previewXyzExport = async (): Promise<void> => {
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
        filetype: 'xyz',
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
        Preview backend-generated XYZ content before adding download or
        write-back behavior.
      </p>
      <button
        disabled={!document || isPreviewing}
        onClick={() => {
          void previewXyzExport();
        }}
        type="button"
      >
        {isPreviewing ? 'Previewing XYZ Export...' : 'Preview XYZ Export'}
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
          <pre
            aria-label="XYZ export preview"
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
