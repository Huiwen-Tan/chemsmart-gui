import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  BroadenedIrSpectrumResponse,
  MoleculeDocument,
} from '../shared/types';
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

const BROADENED_IR_SPECTRUM: BroadenedIrSpectrumResponse = {
  broadening: 'gaussian',
  width_cm_minus_1: 20,
  point_count: 3,
  frequency_unit: 'cm^-1',
  intensity_unit: 'km/mol',
  peaks: [
    {
      mode_index: 1,
      frequency_cm_minus_1: -530.2,
      ir_intensity_km_per_mol: 12.34567,
    },
    {
      mode_index: 3,
      frequency_cm_minus_1: 3745.5,
      ir_intensity_km_per_mol: 4.5,
    },
  ],
  points: [
    { wavenumber_cm_minus_1: -630.2, intensity_km_per_mol: 0.5 },
    { wavenumber_cm_minus_1: -530.2, intensity_km_per_mol: 12.34567 },
    { wavenumber_cm_minus_1: -430.2, intensity_km_per_mol: 0.5 },
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
    expect(within(panel).queryByText('frequency_cm_minus_1'))
      .not.toBeInTheDocument();
    expect(within(panel).queryByText('ir_intensity_km_per_mol'))
      .not.toBeInTheDocument();
    expect(within(panel).getAllByText(/cm⁻¹/).length).toBeGreaterThan(0);

    const table = within(panel).getByRole('table', {
      name: 'IR stick spectrum peaks',
    });
    const rows = within(table).getAllByRole('row');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Mode');
    expect(rows[0]).toHaveTextContent('Frequency (cm⁻¹)');
    expect(rows[0]).toHaveTextContent('IR intensity (km/mol)');
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[1]).toHaveTextContent('-530.2');
    expect(rows[1]).toHaveTextContent('12.3457');
    expect(rows[1]).toHaveAttribute('aria-selected', 'true');
    expect(rows[2]).toHaveTextContent('3');
    expect(rows[2]).toHaveTextContent('3745.5');
    expect(rows[2]).toHaveTextContent('4.5');
    expect(rows[2]).toHaveAttribute('aria-selected', 'false');
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
    const firstModeRow = screen.getByRole('row', {
      name: 'IR mode 1, frequency -530.2 cm⁻¹',
    });
    fireEvent.click(firstModeRow);
    fireEvent.keyDown(firstModeRow, { key: ' ' });

    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(1, 3);
    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(2, 1);
    expect(onSelectedModeIndexChange).toHaveBeenNthCalledWith(3, 1);
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

  it('requests a broadened IR spectrum with selected options', () => {
    const onBroadenedSpectrumPreview = vi.fn();
    render(
      <IrSpectrumPanel
        document={WATER_DOCUMENT}
        onBroadenedSpectrumPreview={onBroadenedSpectrumPreview}
        selectedModeIndex={1}
      />,
    );

    fireEvent.change(
      screen.getByLabelText('IR spectrum broadening'),
      { target: { value: 'lorentzian' } },
    );
    fireEvent.change(
      screen.getByLabelText('IR broadening width'),
      { target: { value: '15' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Preview Broadened Spectrum',
      }),
    );

    expect(onBroadenedSpectrumPreview).toHaveBeenCalledWith({
      broadening: 'lorentzian',
      point_count: 121,
      width_cm_minus_1: 15,
    });
  });

  it('shows the broadened IR spectrum without dumping raw curve points', () => {
    render(
      <IrSpectrumPanel
        broadenedSpectrum={BROADENED_IR_SPECTRUM}
        document={WATER_DOCUMENT}
        selectedModeIndex={1}
      />,
    );

    const panel = screen.getByRole('region', {
      name: 'Broadened IR Spectrum',
    });
    expect(
      within(panel).getByRole('img', {
        name: 'Broadened IR spectrum chart',
      }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('gaussian')).toBeInTheDocument();
    expect(within(panel).getByText('20')).toBeInTheDocument();
    expect(within(panel).getByText('3')).toBeInTheDocument();

    expect(
      within(panel).queryByRole('table', {
        name: 'Broadened IR spectrum points',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows broadened spectrum loading, error, and invalid-width states', () => {
    render(
      <IrSpectrumPanel
        broadenedSpectrumError="Spectrum preview failed."
        document={WATER_DOCUMENT}
        isBroadenedSpectrumLoading
        selectedModeIndex={1}
      />,
    );

    const panel = screen.getByRole('region', {
      name: 'Broadened IR Spectrum',
    });
    expect(
      within(panel).getByText('Generating broadened IR spectrum...'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('Error: Spectrum preview failed.'),
    ).toBeInTheDocument();

    fireEvent.change(
      within(panel).getByLabelText('IR broadening width'),
      { target: { value: '0' } },
    );

    expect(
      within(panel).getByText(
        'IR broadening width must be greater than zero.',
      ),
    ).toBeInTheDocument();
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
