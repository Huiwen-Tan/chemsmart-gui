import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  charge: 0,
  multiplicity: 1,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

describe('ViewerToolbox', () => {
  afterEach(() => cleanup());

  it('exposes only compact view, label, and selection actions', () => {
    render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        selectedAtomIndices={[]}
        showAtomLabels={false}
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer tools' });
    expect(within(toolbox).getByRole('button', { name: 'Reset View' }))
      .toBeEnabled();
    expect(within(toolbox).getByRole('button', { name: 'Show Atom Labels' }))
      .toHaveAttribute('aria-pressed', 'false');
    expect(within(toolbox).getByRole('button', { name: 'Clear Selection' }))
      .toBeDisabled();
    expect(within(toolbox).queryByText('Selection')).not.toBeInTheDocument();
    expect(within(toolbox).queryByText('Show Bonds')).not.toBeInTheDocument();
  });

  it('runs viewer actions and reports a compact selection count', () => {
    const onClearSelection = vi.fn();
    const onResetView = vi.fn();
    const onShowAtomLabelsChange = vi.fn();
    render(
      <ViewerToolbox
        document={WATER}
        onClearSelection={onClearSelection}
        onResetView={onResetView}
        onShowAtomLabelsChange={onShowAtomLabelsChange}
        selectedAtomIndices={[1, 2, 99]}
        showAtomLabels={false}
      />,
    );

    const toolbox = screen.getByRole('region', { name: 'Viewer tools' });
    expect(within(toolbox).getByLabelText('2 selected atoms')).toHaveTextContent('2');

    fireEvent.click(within(toolbox).getByRole('button', { name: 'Reset View' }));
    fireEvent.click(
      within(toolbox).getByRole('button', { name: 'Show Atom Labels' }),
    );
    fireEvent.click(
      within(toolbox).getByRole('button', { name: 'Clear Selection' }),
    );

    expect(onResetView).toHaveBeenCalledOnce();
    expect(onShowAtomLabelsChange).toHaveBeenCalledWith(true);
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it('disables molecule-specific controls without a document', () => {
    render(
      <ViewerToolbox
        document={null}
        onClearSelection={vi.fn()}
        onResetView={vi.fn()}
        onShowAtomLabelsChange={vi.fn()}
        selectedAtomIndices={[]}
        showAtomLabels={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show Atom Labels' }))
      .toBeDisabled();
  });
});
