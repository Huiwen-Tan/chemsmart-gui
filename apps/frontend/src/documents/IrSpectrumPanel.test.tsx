import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { IrSpectrumPanel } from './IrSpectrumPanel';

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'water-document',
  name: 'str-H2O-document',
  document_kind: 'structure',
  source: {
    path: 'sample-data/water.log',
    filename: 'water.log',
    filetype: 'log',
  },
  calculation: {
    program: 'gaussian',
    normal_termination: true,
  },
  coordinate_unit: 'angstrom',
  charge: 0,
  multiplicity: 1,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
  frozen_atom_indices: [],
  vibrational_modes: [
    {
      index: 1,
      frequency_cm_minus_1: -530.2,
      is_imaginary: true,
      reduced_mass_amu: 1.2,
      force_constant_mdyne_per_angstrom: 0.3,
      ir_intensity_km_per_mol: 12.34567,
      symmetry: 'A1',
      displacements: [
        { atom_index: 1, x: 0, y: 0, z: -0.1 },
        { atom_index: 2, x: 0.2, y: 0, z: 0.1 },
      ],
    },
    {
      index: 2,
      frequency_cm_minus_1: 1628.3334,
      is_imaginary: false,
      reduced_mass_amu: null,
      force_constant_mdyne_per_angstrom: null,
      ir_intensity_km_per_mol: null,
      symmetry: null,
      displacements: [],
    },
    {
      index: 3,
      frequency_cm_minus_1: 3745.5,
      is_imaginary: false,
      reduced_mass_amu: 1.1,
      force_constant_mdyne_per_angstrom: 0.8,
      ir_intensity_km_per_mol: 4.5,
      symmetry: 'B2',
      displacements: [],
    },
  ],
};

describe('IrSpectrumPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no document is loaded', () => {
    render(
      <IrSpectrumPanel document={null} selectedModeIndex={null} />,
    );

    const panel = screen.getByRole('region', {
      name: 'IR Stick Spectrum',
    });
    expect(
      within(panel).getByText('No document loaded for IR spectrum.'),
    ).toBeInTheDocument();
  });

  it('shows IR peaks from backend-provided mode fields', () => {
    render(
      <IrSpectrumPanel document={WATER_DOCUMENT} selectedModeIndex={1} />,
    );

    const panel = screen.getByRole('region', {
      name: 'IR Stick Spectrum',
    });
    expect(
      within(panel).getByRole('img', { name: 'IR stick spectrum chart' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('frequency_cm_minus_1'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('ir_intensity_km_per_mol'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('cm^-1')).toBeInTheDocument();
    expect(within(panel).getByText('km/mol')).toBeInTheDocument();

    const table = within(panel).getByRole('table', {
      name: 'IR stick spectrum peaks',
    });
    const rows = within(table).getAllByRole('row');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Mode');
    expect(rows[0]).toHaveTextContent('frequency_cm_minus_1 (cm^-1)');
    expect(rows[0]).toHaveTextContent('ir_intensity_km_per_mol (km/mol)');
    expect(rows[1]).toHaveTextContent('Select IR mode 1');
    expect(rows[1]).toHaveTextContent('-530.2');
    expect(rows[1]).toHaveTextContent('12.3457');
    expect(rows[1]).toHaveAttribute('aria-selected', 'true');
    expect(rows[2]).toHaveTextContent('Select IR mode 3');
    expect(rows[2]).toHaveTextContent('3745.5');
    expect(rows[2]).toHaveTextContent('4.5');
    expect(rows[2]).toHaveAttribute('aria-selected', 'false');
    expect(
      within(table).queryByRole('button', { name: 'Select IR mode 2' }),
    ).not.toBeInTheDocument();
  });

  it('selects modes from the chart and table', () => {
    const onSelectedModeIndexChange = vi.fn();
    render(
      <IrSpectrumPanel
        document={WATER_DOCUMENT}
        onSelectedModeIndexChange={onSelectedModeIndexChange}
        selectedModeIndex={1}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Select IR peak mode 3' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Select IR mode 1' }),
    );

    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(1, 3);
    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(2, 1);
  });

  it('selects modes from the chart with the keyboard', () => {
    const onSelectedModeIndexChange = vi.fn();
    render(
      <IrSpectrumPanel
        document={WATER_DOCUMENT}
        onSelectedModeIndexChange={onSelectedModeIndexChange}
        selectedModeIndex={1}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Select IR peak mode 3' }),
      { key: 'Enter' },
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Select IR peak mode 1' }),
      { key: ' ' },
    );

    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(1, 3);
    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(2, 1);
  });

  it('reports unavailable selected peaks when selected mode is not IR-active', () => {
    render(
      <IrSpectrumPanel document={WATER_DOCUMENT} selectedModeIndex={2} />,
    );

    const panel = screen.getByRole('region', {
      name: 'IR Stick Spectrum',
    });
    expect(within(panel).getByText('Selected IR peak')).toBeInTheDocument();
    expect(within(panel).getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows an empty state when no modes have positive IR intensity', () => {
    render(
      <IrSpectrumPanel
        document={{
          ...WATER_DOCUMENT,
          vibrational_modes: WATER_DOCUMENT.vibrational_modes.map((mode) => ({
            ...mode,
            ir_intensity_km_per_mol: null,
          })),
        }}
        selectedModeIndex={1}
      />,
    );

    const panel = screen.getByRole('region', {
      name: 'IR Stick Spectrum',
    });
    expect(
      within(panel).getByText(
        'No positive ir_intensity_km_per_mol values available.',
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole('table', {
        name: 'IR stick spectrum peaks',
      }),
    ).not.toBeInTheDocument();
  });
});
