import type { ReactNode } from 'react';

import type { MoleculeDocument } from '../shared/types';

interface ViewerToolboxProps {
  document: MoleculeDocument | null;
  onClearSelection: () => void;
  onResetView: () => void;
  onShowAtomLabelsChange: (showAtomLabels: boolean) => void;
  onShowBondsChange: (showBonds: boolean) => void;
  selectedAtomIndices: readonly number[];
  showAtomLabels: boolean;
  showBonds: boolean;
}

export function ViewerToolbox({
  document,
  onClearSelection,
  onResetView,
  onShowAtomLabelsChange,
  onShowBondsChange,
  selectedAtomIndices,
  showAtomLabels,
  showBonds,
}: ViewerToolboxProps): JSX.Element {
  const selectedAtoms = getVisibleSelectedAtomIndices(
    document,
    selectedAtomIndices,
  );
  const selectedAtomLabel =
    selectedAtoms.length > 0
      ? `Selected atoms: ${selectedAtoms.join(', ')}`
      : 'No atoms selected';
  const moleculeStateLabel = document
    ? `${document.atoms.length} atom${document.atoms.length === 1 ? '' : 's'}`
    : 'No molecule loaded';
  const measurementHint = formatMeasurementHint(selectedAtoms.length);

  return (
    <section
      aria-label="Viewer toolbox"
      className="workbench-viewer-toolbox"
    >
      <ToolboxGroup label="Selection">
        <p className="workbench-viewer-toolbox-status">
          {moleculeStateLabel}
        </p>
        <p className="workbench-viewer-toolbox-status">
          {selectedAtomLabel}
        </p>
        <button
          className="workbench-viewer-toolbox-button"
          disabled={selectedAtoms.length === 0}
          onClick={onClearSelection}
          type="button"
        >
          Clear Selection
        </button>
      </ToolboxGroup>
      <ToolboxGroup label="Navigate">
        <button
          className="workbench-viewer-toolbox-button"
          onClick={onResetView}
          type="button"
        >
          Reset View
        </button>
        <p className="workbench-viewer-toolbox-hint">
          Drag rotate; right/middle drag pan; wheel zoom
        </p>
      </ToolboxGroup>
      <ToolboxGroup label="Measure">
        <p className="workbench-viewer-toolbox-status">{measurementHint}</p>
        <p className="workbench-viewer-toolbox-hint">
          Values appear in the Details panel.
        </p>
      </ToolboxGroup>
      <ToolboxGroup label="Display">
        <button
          aria-pressed={showBonds}
          className="workbench-viewer-toolbox-button"
          onClick={() => onShowBondsChange(!showBonds)}
          type="button"
        >
          Show Bonds
        </button>
        <button
          aria-pressed={showAtomLabels}
          className="workbench-viewer-toolbox-button"
          onClick={() => onShowAtomLabelsChange(!showAtomLabels)}
          type="button"
        >
          Show Atom Labels
        </button>
      </ToolboxGroup>
      <ToolboxGroup label="Edit">
        <button
          className="workbench-viewer-toolbox-button"
          disabled
          type="button"
        >
          Add Atom Tool
        </button>
        <button
          className="workbench-viewer-toolbox-button"
          disabled
          type="button"
        >
          Bond Tool
        </button>
        <button
          className="workbench-viewer-toolbox-button"
          disabled
          type="button"
        >
          Geometry Tool
        </button>
      </ToolboxGroup>
    </section>
  );
}

interface ToolboxGroupProps {
  children: ReactNode;
  label: string;
}

function ToolboxGroup({ children, label }: ToolboxGroupProps): JSX.Element {
  return (
    <div aria-label={`${label} tools`} className="workbench-viewer-toolbox-group">
      <p className="workbench-viewer-toolbox-label">{label}</p>
      <div className="workbench-viewer-toolbox-items">{children}</div>
    </div>
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

function formatMeasurementHint(selectedAtomCount: number): string {
  if (selectedAtomCount === 2) {
    return 'Distance measurement ready';
  }
  if (selectedAtomCount === 3) {
    return 'Angle measurement ready';
  }
  if (selectedAtomCount === 4) {
    return 'Dihedral measurement ready';
  }
  return 'Select 2, 3, or 4 atoms to measure';
}
