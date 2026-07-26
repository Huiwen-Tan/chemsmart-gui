import type { MoleculeDocument } from '../shared/types';

interface DocumentSummaryPanelProps {
  document: MoleculeDocument | null;
  hasUnsavedMoleculeEdits?: boolean;
}

function formatCalculationState(
  calculation: MoleculeDocument['calculation'],
): string {
  if (!calculation) {
    return 'Unavailable';
  }

  return calculation.normal_termination
    ? 'Normal termination'
    : 'Incomplete or failed';
}

function formatSourceSize(source: MoleculeDocument['source']): string {
  if (source?.size_bytes === undefined || source.size_bytes === null) {
    return 'Unavailable';
  }
  if (source.size_bytes < 1024) {
    return `${source.size_bytes} B`;
  }
  if (source.size_bytes < 1024 * 1024) {
    return `${(source.size_bytes / 1024).toFixed(1)} KB`;
  }
  return `${(source.size_bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSourceModifiedTime(
  source: MoleculeDocument['source'],
): string {
  if (
    source?.modified_time_ns === undefined ||
    source.modified_time_ns === null
  ) {
    return 'Unavailable';
  }
  const modifiedTime = new Date(source.modified_time_ns / 1_000_000);
  if (Number.isNaN(modifiedTime.getTime())) {
    return 'Unavailable';
  }
  return modifiedTime.toLocaleString();
}

function countImaginaryModes(document: MoleculeDocument): number {
  return document.vibrational_modes.filter((mode) => mode.is_imaginary)
    .length;
}

function formatDocumentKind(kind: MoleculeDocument['document_kind']): string {
  return kind === 'structure' ? 'Structure' : kind;
}

function formatProgram(
  program: NonNullable<MoleculeDocument['calculation']>['program'],
): string {
  return program === 'orca' ? 'ORCA' : 'Gaussian';
}

export function DocumentSummaryPanel({
  document,
  hasUnsavedMoleculeEdits = false,
}: DocumentSummaryPanelProps): JSX.Element {
  return (
    <section
      aria-labelledby="document-summary-heading"
      className="workbench-result-panel"
    >
      <h2 id="document-summary-heading">Current Document</h2>
      {document ? (
        <dl className="workbench-metadata-list">
          <dt>Name</dt>
          <dd>{document.name}</dd>
          <dt>Document kind</dt>
          <dd>{formatDocumentKind(document.document_kind)}</dd>
          <dt>Source file</dt>
          <dd>{document.source?.filename ?? 'Unavailable'}</dd>
          <dt>File type</dt>
          <dd>{document.source?.filetype.toUpperCase() ?? 'Unavailable'}</dd>
          <dt>Source path</dt>
          <dd>{document.source?.path ?? 'Unavailable'}</dd>
          <dt>Source size</dt>
          <dd>{formatSourceSize(document.source)}</dd>
          <dt>Source modified</dt>
          <dd>{formatSourceModifiedTime(document.source)}</dd>
          <dt>Molecule edit state</dt>
          <dd>
            {hasUnsavedMoleculeEdits
              ? 'Unsaved edits'
              : 'No unsaved edits'}
          </dd>
          {document.calculation ? (
            <>
              <dt>Calculation program</dt>
              <dd>{formatProgram(document.calculation.program)}</dd>
              <dt>Calculation state</dt>
              <dd>{formatCalculationState(document.calculation)}</dd>
            </>
          ) : null}
          {document.vibrational_modes.length > 0 ? (
            <>
              <dt>Vibrational modes</dt>
              <dd>{document.vibrational_modes.length}</dd>
              <dt>Imaginary vibrational modes</dt>
              <dd>{countImaginaryModes(document)}</dd>
              <dt>Vibrational frequency unit</dt>
              <dd>cm⁻¹</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p>No document loaded.</p>
      )}
    </section>
  );
}
