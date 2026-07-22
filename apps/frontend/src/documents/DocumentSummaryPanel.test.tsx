import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { DocumentSummaryPanel } from './DocumentSummaryPanel';

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'water',
  name: 'str-H2O-102b86d02472',
  document_kind: 'structure',
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
    size_bytes: 86,
    modified_time_ns: 123456789,
  },
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [],
  bonds: [],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const GAUSSIAN_OUTPUT_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'water-log',
  source: {
    path: 'sample-data/water.log',
    filename: 'water.log',
    filetype: 'log',
  },
  calculation: {
    program: 'gaussian',
    normal_termination: true,
  },
  vibrational_modes: [
    {
      index: 1,
      frequency_cm_minus_1: -530.2,
      is_imaginary: true,
      reduced_mass_amu: 1.2,
      force_constant_mdyne_per_angstrom: 0.3,
      ir_intensity_km_per_mol: 12.3,
      symmetry: 'A1',
      displacements: [],
    },
    {
      index: 2,
      frequency_cm_minus_1: 1628.3,
      is_imaginary: false,
      reduced_mass_amu: 1.1,
      force_constant_mdyne_per_angstrom: 1.7,
      ir_intensity_km_per_mol: 71.7,
      symmetry: 'B2',
      displacements: [],
    },
  ],
};

const INCOMPLETE_OUTPUT_DOCUMENT: MoleculeDocument = {
  ...GAUSSIAN_OUTPUT_DOCUMENT,
  id: 'incomplete-water-log',
  calculation: {
    program: 'gaussian',
    normal_termination: false,
  },
};

describe('DocumentSummaryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no document is loaded', () => {
    render(<DocumentSummaryPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('No document loaded.')).toBeInTheDocument();
  });

  it('shows document kind and source metadata for a loaded document', () => {
    render(<DocumentSummaryPanel document={WATER_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('str-H2O-102b86d02472')).toBeInTheDocument();
    expect(within(panel).getByText('structure')).toBeInTheDocument();
    expect(within(panel).getByText('water.xyz')).toBeInTheDocument();
    expect(within(panel).getByText('xyz')).toBeInTheDocument();
    expect(
      within(panel).getByText('sample-data/water.xyz'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Source size')).toBeInTheDocument();
    expect(within(panel).getByText('86 bytes')).toBeInTheDocument();
    expect(
      within(panel).getByText('Source modified timestamp'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('123456789 ns')).toBeInTheDocument();
    expect(within(panel).getByText('Calculation program')).toBeInTheDocument();
    expect(within(panel).getByText('normal_termination')).toBeInTheDocument();
    expect(within(panel).getByText('Calculation state')).toBeInTheDocument();
    expect(within(panel).getByText('Molecule edit state')).toBeInTheDocument();
    expect(within(panel).getByText('No unsaved edits')).toBeInTheDocument();
    expect(within(panel).getByText('Vibrational modes')).toBeInTheDocument();
    expect(
      within(panel).getByText('Imaginary vibrational modes'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('Vibrational frequency unit'),
    ).toBeInTheDocument();
    expect(within(panel).getAllByText('0')).toHaveLength(2);
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(4);
  });

  it('shows unsaved molecule edit state for edited documents', () => {
    render(
      <DocumentSummaryPanel
        document={WATER_DOCUMENT}
        hasUnsavedMoleculeEdits
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('Unsaved edits')).toBeInTheDocument();
  });

  it('shows unavailable source fields without inventing metadata', () => {
    render(
      <DocumentSummaryPanel
        document={{
          ...WATER_DOCUMENT,
          source: null,
        }}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(9);
  });

  it('shows unavailable source revision when source lacks file metadata', () => {
    render(
      <DocumentSummaryPanel
        document={{
          ...WATER_DOCUMENT,
          source: {
            path: 'sample-data/water.xyz',
            filename: 'water.xyz',
            filetype: 'xyz',
            size_bytes: null,
            modified_time_ns: null,
          },
        }}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(6);
  });

  it('shows calculation metadata for output documents', () => {
    render(<DocumentSummaryPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('water.log')).toBeInTheDocument();
    expect(within(panel).getByText('gaussian')).toBeInTheDocument();
    expect(within(panel).getByText('true')).toBeInTheDocument();
    expect(within(panel).getByText('Normal termination')).toBeInTheDocument();
    expect(within(panel).getByText('2')).toBeInTheDocument();
    expect(within(panel).getByText('1')).toBeInTheDocument();
    expect(within(panel).getByText('cm^-1')).toBeInTheDocument();
  });

  it('shows incomplete or failed state for non-normal termination', () => {
    render(<DocumentSummaryPanel document={INCOMPLETE_OUTPUT_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('false')).toBeInTheDocument();
    expect(within(panel).getByText('Incomplete or failed')).toBeInTheDocument();
  });
});
