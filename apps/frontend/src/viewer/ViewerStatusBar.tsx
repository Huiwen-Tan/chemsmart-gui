import type { MoleculeDocument, VibrationalMode } from '../shared/types';

interface ViewerStatusBarProps {
  document: MoleculeDocument | null;
  selectedAtomIndices: readonly number[];
  selectedVibrationalMode?: VibrationalMode | null;
}

export function ViewerStatusBar({
  document,
  selectedAtomIndices,
  selectedVibrationalMode,
}: ViewerStatusBarProps): JSX.Element {
  const statusItems = document
    ? [
        formatCount(document.atoms.length, 'atom'),
        formatCount(document.bonds.length, 'bond'),
        formatNullableNumber('charge', document.charge),
        formatNullableNumber('multiplicity', document.multiplicity),
        formatSelectedAtoms(document, selectedAtomIndices),
        formatSelectedMode(selectedVibrationalMode),
      ].filter((item): item is string => item !== null)
    : ['No molecule loaded', 'No atoms selected'];

  return (
    <section
      aria-label="Viewer status"
      aria-live="polite"
      className="workbench-viewer-status-bar"
    >
      {statusItems.map((statusItem) => (
        <span className="workbench-viewer-status-item" key={statusItem}>
          {statusItem}
        </span>
      ))}
    </section>
  );
}

function formatCount(count: number, singularLabel: string): string {
  return `${count} ${singularLabel}${count === 1 ? '' : 's'}`;
}

function formatNullableNumber(label: string, value: number | null): string {
  return value === null ? `${label} unavailable` : `${label} ${value}`;
}

function formatSelectedAtoms(
  document: MoleculeDocument,
  selectedAtomIndices: readonly number[],
): string {
  const atomIndices = new Set(document.atoms.map((atom) => atom.index));
  const visibleSelectedAtomIndices = selectedAtomIndices.filter((atomIndex) =>
    atomIndices.has(atomIndex),
  );

  if (visibleSelectedAtomIndices.length === 0) {
    return 'No atoms selected';
  }

  const label =
    visibleSelectedAtomIndices.length === 1
      ? 'Selected atom'
      : 'Selected atoms';
  return `${label} ${visibleSelectedAtomIndices.join(', ')}`;
}

function formatSelectedMode(
  selectedVibrationalMode: VibrationalMode | null | undefined,
): string | null {
  if (!selectedVibrationalMode) {
    return null;
  }

  const imaginaryStatus = selectedVibrationalMode.is_imaginary
    ? ' (imaginary)'
    : '';
  return (
    `Mode ${selectedVibrationalMode.index}: ` +
    `${selectedVibrationalMode.frequency_cm_minus_1.toFixed(1)} cm^-1` +
    imaginaryStatus
  );
}
