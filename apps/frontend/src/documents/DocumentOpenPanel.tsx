interface DocumentOpenPanelProps {
  backendHealthStatus: string;
  documentOpenStatus?: string | null;
  error: string | null;
  isOpeningDocument: boolean;
  onChooseDocument: () => void;
  openingDocumentName?: string | null;
}

export function DocumentOpenPanel({
  backendHealthStatus,
  documentOpenStatus = null,
  error,
  isOpeningDocument,
  onChooseDocument,
  openingDocumentName,
}: DocumentOpenPanelProps): JSX.Element {
  const backendHealth = formatBackendHealth(backendHealthStatus);

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
        Backend: <strong data-status={backendHealth.status}>{backendHealth.label}</strong>
        <span aria-hidden="true" className="workbench-visually-hidden">
          {backendHealthStatus}
        </span>
      </p>

      <button
        className="workbench-button workbench-button-primary workbench-document-choose-button"
        disabled={isOpeningDocument || backendHealth.status === 'unavailable'}
        onClick={onChooseDocument}
        type="button"
      >
        Choose File...
      </button>

      <p className="workbench-document-open-status" role="status">
        {isOpeningDocument
          ? `Opening ${openingDocumentName || 'document'}...`
          : (documentOpenStatus ?? 'Choose a local molecular document to open.')}
      </p>
      {error ? (
        <p className="workbench-error" role="alert">
          Error: {error}
        </p>
      ) : null}

      <section
        aria-labelledby="supported-documents-heading"
        className="workbench-document-open-hints"
      >
        <h3 id="supported-documents-heading">Supported Documents</h3>
        <p>
          Structures: .xyz. Inputs: Gaussian .com/.gjf and ORCA .inp. Outputs:
          Gaussian .log, ORCA .out, and xTB .out. In the desktop app, open the
          main xTB .out from its result folder so companion files are included.
        </p>
      </section>
    </section>
  );
}

function formatBackendHealth(status: string): {
  label: string;
  status: 'checking' | 'connected' | 'unavailable';
} {
  if (status === 'ok') {
    return { label: 'Connected', status: 'connected' };
  }
  if (status === 'unavailable') {
    return { label: 'Unavailable', status: 'unavailable' };
  }
  return { label: 'Checking...', status: 'checking' };
}
