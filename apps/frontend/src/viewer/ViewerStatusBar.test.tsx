import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument, VibrationalMode } from '../shared/types';
import { ViewerStatusBar } from './ViewerStatusBar';

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
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

const GAUSSIAN_WATER = {
  ...WATER,
  charge: 0,
  multiplicity: 1,
} satisfies MoleculeDocument;

const IMAGINARY_MODE = {
  index: 1,
  frequency_cm_minus_1: -530.2,
  is_imaginary: true,
  reduced_mass_amu: null,
  force_constant_mdyne_per_angstrom: null,
  ir_intensity_km_per_mol: 12.3,
  symmetry: null,
  displacements: [],
} satisfies VibrationalMode;

describe('ViewerStatusBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an explicit empty molecule status', () => {
    render(<ViewerStatusBar document={null} selectedAtomIndices={[]} />);

    const status = screen.getByRole('region', { name: 'Viewer status' });

    expect(status).toHaveTextContent('No molecule loaded');
    expect(status).toHaveTextContent('No atoms selected');
  });

  it('shows molecule counts and unavailable charge state from the document', () => {
    render(<ViewerStatusBar document={WATER} selectedAtomIndices={[]} />);

    const status = screen.getByRole('region', { name: 'Viewer status' });

    expect(status).toHaveTextContent('3 atoms');
    expect(status).toHaveTextContent('2 bonds');
    expect(status).toHaveTextContent('charge unavailable');
    expect(status).toHaveTextContent('multiplicity unavailable');
  });

  it('shows provided charge, multiplicity, and valid selected atoms', () => {
    render(
      <ViewerStatusBar
        document={GAUSSIAN_WATER}
        selectedAtomIndices={[1, 99, 2]}
      />,
    );

    const status = screen.getByRole('region', { name: 'Viewer status' });

    expect(status).toHaveTextContent('charge 0');
    expect(status).toHaveTextContent('multiplicity 1');
    expect(status).toHaveTextContent('Selected atoms 1, 2');
    expect(status).not.toHaveTextContent('99');
  });

  it('shows selected vibrational mode context when provided', () => {
    render(
      <ViewerStatusBar
        document={GAUSSIAN_WATER}
        selectedAtomIndices={[]}
        selectedVibrationalMode={IMAGINARY_MODE}
      />,
    );

    expect(
      within(screen.getByRole('region', { name: 'Viewer status' })).getByText(
        'Mode 1: -530.2 cm^-1 (imaginary)',
      ),
    ).toBeInTheDocument();
  });
});
