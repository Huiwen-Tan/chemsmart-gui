import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { useViewerStore } from '../state/useViewerStore';
import { SelectedAtomPanel } from './SelectedAtomPanel';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'water',
  document_kind: 'structure',
  source: null,
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

const WATER_WITH_EXTRA_ATOM: MoleculeDocument = {
  ...WATER,
  atoms: [
    ...WATER.atoms,
    { index: 4, element: 'H', x: 0, y: -0.58, z: 0 },
  ],
};

const DIHEDRAL_FRAGMENT: MoleculeDocument = {
  id: 'dihedral-fragment',
  name: 'dihedral-fragment',
  document_kind: 'structure',
  source: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'C', x: 1, y: 0, z: 0 },
    { index: 2, element: 'C', x: 0, y: 0, z: 0 },
    { index: 3, element: 'C', x: 0, y: 1, z: 0 },
    { index: 4, element: 'H', x: 0, y: 1, z: 1 },
  ],
  bonds: [],
};

const DIHEDRAL_FRAGMENT_WITH_EXTRA_ATOM: MoleculeDocument = {
  ...DIHEDRAL_FRAGMENT,
  atoms: [
    ...DIHEDRAL_FRAGMENT.atoms,
    { index: 5, element: 'H', x: 0, y: 1, z: -1 },
  ],
};

const COLLINEAR_FRAGMENT: MoleculeDocument = {
  ...DIHEDRAL_FRAGMENT,
  id: 'collinear-fragment',
  name: 'collinear-fragment',
  atoms: [
    { index: 1, element: 'C', x: 0, y: 0, z: 0 },
    { index: 2, element: 'C', x: 1, y: 0, z: 0 },
    { index: 3, element: 'C', x: 2, y: 0, z: 0 },
    { index: 4, element: 'H', x: 3, y: 0, z: 0 },
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
    expect(
      screen.queryByRole('button', { name: 'Clear Selection' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
  });

  it('clears selected atoms from the panel control', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 1] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByRole('button', { name: 'Clear Selection' }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
    expect(
      screen.getByText('Select an atom to inspect its metadata.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows selected metadata and distance for two valid selected atoms', () => {
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
    expect(screen.getByText('Distance:')).toBeInTheDocument();
    expect(screen.getByText('3 H - 1 O = 0.956 angstrom')).toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3, 99, 1]);
  });

  it('shows selected metadata and angle using the second atom as the vertex', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 99, 1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByText('Angle:')).toBeInTheDocument();
    expect(
      screen.getByText('3 H - 1 O - 2 H = 105.301 degrees'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      3,
      99,
      1,
      2,
    ]);
  });

  it('shows selected metadata and dihedral in interaction order', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 99, 2, 3, 4] });

    render(<SelectedAtomPanel document={DIHEDRAL_FRAGMENT} />);

    expect(screen.getByText('Dihedral:')).toBeInTheDocument();
    expect(
      screen.getByText('1 C - 2 C - 3 C - 4 H = -90.000 degrees'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      1,
      99,
      2,
      3,
      4,
    ]);
  });

  it.each([
    { selectedAtomIndices: [1] },
    { selectedAtomIndices: [1, 2, 3, 99] },
  ])(
    'does not show a distance for selection $selectedAtomIndices',
    ({ selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={WATER} />);

      expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    },
  );

  it.each([
    { document: WATER, selectedAtomIndices: [1] },
    { document: WATER, selectedAtomIndices: [1, 99, 2] },
    { document: WATER_WITH_EXTRA_ATOM, selectedAtomIndices: [1, 2, 3, 4] },
  ])(
    'does not show an angle for selection $selectedAtomIndices',
    ({ document, selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={document} />);

      expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    },
  );

  it('does not invent an angle from degenerate vectors', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 4, 2] });

    render(
      <SelectedAtomPanel
        document={{
          ...WATER,
          atoms: [
            ...WATER.atoms,
            { index: 4, element: 'H', x: 0, y: 0, z: 0 },
          ],
        }}
      />,
    );

    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 4, 2]);
  });

  it.each([
    { document: DIHEDRAL_FRAGMENT, selectedAtomIndices: [1] },
    { document: DIHEDRAL_FRAGMENT, selectedAtomIndices: [1, 2, 3] },
    {
      document: DIHEDRAL_FRAGMENT_WITH_EXTRA_ATOM,
      selectedAtomIndices: [1, 2, 3, 4, 5],
    },
  ])(
    'does not show a dihedral for selection $selectedAtomIndices',
    ({ document, selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={document} />);

      expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    },
  );

  it('does not invent a dihedral from degenerate vectors', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3, 4] });

    render(<SelectedAtomPanel document={COLLINEAR_FRAGMENT} />);

    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      1,
      2,
      3,
      4,
    ]);
  });
});
