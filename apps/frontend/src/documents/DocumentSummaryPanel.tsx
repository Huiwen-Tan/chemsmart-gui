import type { MoleculeDocument } from '../shared/types';

interface DocumentSummaryPanelProps {
  document: MoleculeDocument | null;
}

export function DocumentSummaryPanel({
  document,
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
        </dl>
      ) : (
        <p>No document loaded.</p>
      )}
    </section>
  );
}
