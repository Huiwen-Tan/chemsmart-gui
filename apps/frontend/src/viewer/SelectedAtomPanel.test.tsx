import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { useViewerStore } from '../state/useViewerStore';
import { SelectedAtomPanel } from './SelectedAtomPanel';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'water',
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
};

describe('SelectedAtomPanel', () => {
  beforeEach(() => {
    useViewerStore.setState({ selectedAtomIndices: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows an explicit empty state without a valid selection', () => {
    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByText('Select an atom to inspect its metadata.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows selected atom metadata in interaction order', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 99, 1] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByText('Coordinates (angstrom)')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('3 H');
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['-0.760', '0.580', '0.000']);
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('1 O');
    expect(within(rows[2]).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['0.000', '0.000', '0.000']);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3, 99, 1]);
  });
});
