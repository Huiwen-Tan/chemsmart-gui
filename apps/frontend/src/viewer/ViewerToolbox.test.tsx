import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { ViewerToolbox } from './ViewerToolbox';

const WATER = {
  id: 'water',
  name: 'water',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
    { index: 4, element: 'H', x: 0, y: -0.9, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

describe('ViewerToolbox', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows empty molecule and selection states', () => {
    render(
      <ViewerToolbox
        document={null}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[]}
        showAtomLabels={false}
        showBonds
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer toolbox' });

    expect(toolbox).toHaveTextContent('No molecule loaded');
    expect(toolbox).toHaveTextContent('No atoms selected');
    expect(
      within(toolbox).getByRole('button', { name: 'Clear Selection' }),
    ).toBeDisabled();
  });

  it('shows selected atoms and clears the current selection', () => {
    const onClearSelection = vi.fn();
    render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={onClearSelection}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[1, 99, 2]}
        showAtomLabels={false}
        showBonds
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer toolbox' });

    expect(toolbox).toHaveTextContent('4 atoms');
    expect(toolbox).toHaveTextContent('Selected atoms: 1, 2');
    expect(toolbox).not.toHaveTextContent('99');

    fireEvent.click(
      within(toolbox).getByRole('button', { name: 'Clear Selection' }),
    );

    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('runs view and display actions', () => {
    const onResetView = vi.fn();
    const onShowAtomLabelsChange = vi.fn();
    const onShowBondsChange = vi.fn();
    render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={onResetView}
        onShowAtomLabelsChange={onShowAtomLabelsChange}
        onShowBondsChange={onShowBondsChange}
        selectedAtomIndices={[]}
        showAtomLabels={false}
        showBonds
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer toolbox' });
    fireEvent.click(within(toolbox).getByRole('button', { name: 'Reset View' }));
    fireEvent.click(within(toolbox).getByRole('button', { name: 'Show Bonds' }));
    fireEvent.click(
      within(toolbox).getByRole('button', { name: 'Show Atom Labels' }),
    );

    expect(onResetView).toHaveBeenCalledTimes(1);
    expect(onShowBondsChange).toHaveBeenCalledWith(false);
    expect(onShowAtomLabelsChange).toHaveBeenCalledWith(true);
  });

  it('shows measurement readiness from selection count only', () => {
    const { rerender } = render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[1, 2]}
        showAtomLabels={false}
        showBonds
      />,
    );

    expect(screen.getByRole('region', { name: 'Viewer toolbox' }))
      .toHaveTextContent('Distance measurement ready');

    rerender(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[1, 2, 3]}
        showAtomLabels={false}
        showBonds
      />,
    );

    expect(screen.getByRole('region', { name: 'Viewer toolbox' }))
      .toHaveTextContent('Angle measurement ready');

    rerender(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[1, 2, 3, 4]}
        showAtomLabels={false}
        showBonds
      />,
    );

    expect(screen.getByRole('region', { name: 'Viewer toolbox' }))
      .toHaveTextContent('Dihedral measurement ready');
  });

  it('keeps future edit tools disabled', () => {
    render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        onShowBondsChange={vi.fn()}
        selectedAtomIndices={[]}
        showAtomLabels={false}
        showBonds
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer toolbox' });

    expect(
      within(toolbox).getByRole('button', { name: 'Add Atom Tool' }),
    ).toBeDisabled();
    expect(
      within(toolbox).getByRole('button', { name: 'Bond Tool' }),
    ).toBeDisabled();
    expect(
      within(toolbox).getByRole('button', { name: 'Geometry Tool' }),
    ).toBeDisabled();
  });
});
