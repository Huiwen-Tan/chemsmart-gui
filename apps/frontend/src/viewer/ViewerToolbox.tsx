import type { MoleculeDocument } from '../shared/types';

interface ViewerToolboxProps {
  document: MoleculeDocument | null;
  onClearSelection: () => void;
  onResetView: () => void;
  onShowAtomLabelsChange: (showAtomLabels: boolean) => void;
  selectedAtomIndices: readonly number[];
  showAtomLabels: boolean;
}

export function ViewerToolbox({
  document,
  onClearSelection,
  onResetView,
  onShowAtomLabelsChange,
  selectedAtomIndices,
  showAtomLabels,
}: ViewerToolboxProps): JSX.Element {
  const visibleSelectedAtomIndices = getVisibleSelectedAtomIndices(
    document,
    selectedAtomIndices,
  );

  return (
    <section aria-label="Viewer tools" className="workbench-viewer-toolbox">
      <button
        aria-label="Reset View"
        className="workbench-viewer-toolbox-button"
        onClick={onResetView}
        title="Reset view"
        type="button"
      >
        <ResetViewIcon />
      </button>
      <button
        aria-label="Show Atom Labels"
        aria-pressed={showAtomLabels}
        className="workbench-viewer-toolbox-button"
        disabled={!document}
        onClick={() => onShowAtomLabelsChange(!showAtomLabels)}
        title="Show atom labels"
        type="button"
      >
        <LabelIcon />
      </button>
      <button
        aria-label="Clear Selection"
        className="workbench-viewer-toolbox-button"
        disabled={visibleSelectedAtomIndices.length === 0}
        onClick={onClearSelection}
        title="Clear atom selection"
        type="button"
      >
        <ClearSelectionIcon />
      </button>
      {visibleSelectedAtomIndices.length > 0 ? (
        <span
          aria-label={`${visibleSelectedAtomIndices.length} selected atoms`}
          className="workbench-viewer-toolbox-count"
          title={`Selected atoms: ${visibleSelectedAtomIndices.join(', ')}`}
        >
          {visibleSelectedAtomIndices.length}
        </span>
      ) : null}
    </section>
  );
}

function getVisibleSelectedAtomIndices(
  document: MoleculeDocument | null,
  selectedAtomIndices: readonly number[],
): number[] {
  if (!document) {
    return [];
  }

  const atomIndices = new Set(document.atoms.map((atom) => atom.index));
  return selectedAtomIndices.filter((atomIndex) => atomIndices.has(atomIndex));
}

function ResetViewIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.67" />
      <path d="M4 4v4.67h4.67" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function LabelIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h10l6 7-6 7H4z" />
      <circle cx="8" cy="12" r="1.5" />
    </svg>
  );
}

function ClearSelectionIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="m9 9 6 6m0-6-6 6" />
    </svg>
  );
}
