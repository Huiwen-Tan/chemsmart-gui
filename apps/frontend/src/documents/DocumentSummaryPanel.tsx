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
  return `${source.size_bytes} bytes`;
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
  return `${source.modified_time_ns} ns`;
}

export function DocumentSummaryPanel({
  document,
  hasUnsavedMoleculeEdits = false,
}: DocumentSummaryPanelProps): JSX.Element {
  return (
    <section
      aria-labelledby="document-summary-heading"
      style={{ marginTop: 16 }}
    >
      <h2 id="document-summary-heading">Current Document</h2>
      {document ? (
        <dl>
          <dt>Name</dt>
          <dd>{document.name}</dd>
          <dt>Document kind</dt>
          <dd>{document.document_kind}</dd>
          <dt>Source file</dt>
          <dd>{document.source?.filename ?? 'Unavailable'}</dd>
          <dt>Filetype</dt>
          <dd>{document.source?.filetype ?? 'Unavailable'}</dd>
          <dt>Source path</dt>
          <dd>{document.source?.path ?? 'Unavailable'}</dd>
          <dt>Source size</dt>
          <dd>{formatSourceSize(document.source)}</dd>
          <dt>Source modified timestamp</dt>
          <dd>{formatSourceModifiedTime(document.source)}</dd>
          <dt>Molecule edit state</dt>
          <dd>
            {hasUnsavedMoleculeEdits
              ? 'Unsaved edits'
              : 'No unsaved edits'}
          </dd>
          <dt>Calculation program</dt>
          <dd>{document.calculation?.program ?? 'Unavailable'}</dd>
          <dt>normal_termination</dt>
          <dd>
            {document.calculation
              ? String(document.calculation.normal_termination)
              : 'Unavailable'}
          </dd>
          <dt>Calculation state</dt>
          <dd>{formatCalculationState(document.calculation)}</dd>
        </dl>
      ) : (
        <p>No document loaded.</p>
      )}
    </section>
  );
}
