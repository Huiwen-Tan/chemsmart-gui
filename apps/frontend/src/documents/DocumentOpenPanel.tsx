interface DocumentOpenPanelProps {
  backendHealthStatus: string;
  documentPath: string;
  error: string | null;
  isOpeningDocument: boolean;
  onDocumentOpen: (pathOverride?: string) => void;
  onDocumentPathChange: (path: string) => void;
  openingDocumentPath?: string | null;
}

export function DocumentOpenPanel({
  backendHealthStatus,
  documentPath,
  error,
  isOpeningDocument,
  onDocumentOpen,
  onDocumentPathChange,
  openingDocumentPath,
}: DocumentOpenPanelProps): JSX.Element {
  const trimmedDocumentPath = documentPath.trim();
  const activeOpeningPath = openingDocumentPath ?? trimmedDocumentPath;

  return (
    <section
      aria-labelledby="document-open-heading"
      className="workbench-document-open"
    >
      <div className="workbench-panel-heading">
        <h2 id="document-open-heading">Open Document</h2>
        <p>
          Open molecules, inputs, or calculation outputs through the CHEMSMART
          backend service.
        </p>
      </div>

      <p className="workbench-status-line">
        Backend health: <strong>{backendHealthStatus}</strong>
      </p>

      <form
        className="workbench-form"
        onSubmit={(event) => {
          event.preventDefault();
          onDocumentOpen();
        }}
      >
        <label className="workbench-field">
          <span className="workbench-field-label">Document path</span>
          <input
            className="workbench-input"
            onChange={(event) => onDocumentPathChange(event.currentTarget.value)}
            placeholder="sample-data/water.xyz"
            type="text"
            value={documentPath}
          />
        </label>
        <button
          className="workbench-button workbench-button-primary"
          disabled={isOpeningDocument}
          type="submit"
        >
          Open Document
        </button>
      </form>

      <p className="workbench-document-open-status" role="status">
        {isOpeningDocument
          ? `Opening ${activeOpeningPath || 'document'}...`
          : 'Ready to open a local document path.'}
      </p>
      {error ? <p className="workbench-error">Error: {error}</p> : null}

      <section
        aria-labelledby="supported-documents-heading"
        className="workbench-document-open-hints"
      >
        <h3 id="supported-documents-heading">Supported Documents</h3>
        <p>
          Structures: .xyz. Inputs: Gaussian .com/.gjf and ORCA .inp. Outputs:
          Gaussian .log and ORCA .out.
        </p>
      </section>
    </section>
  );
}
