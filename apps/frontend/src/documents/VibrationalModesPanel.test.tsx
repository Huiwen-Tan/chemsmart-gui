import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { VibrationalModesPanel } from './VibrationalModesPanel';

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'water-document',
  name: 'str-H2O-document',
  document_kind: 'structure',
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
  },
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const GAUSSIAN_OUTPUT_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'gaussian-output-document',
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
  ],
};

describe('VibrationalModesPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no document is loaded', () => {
    render(<VibrationalModesPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Vibrational Modes' });
    expect(
      within(panel).getByText('No document loaded for vibrational modes.'),
    ).toBeInTheDocument();
  });

  it('shows an empty state when the document has no vibrational modes', () => {
    render(<VibrationalModesPanel document={WATER_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Vibrational Modes' });
    expect(
      within(panel).getByText(
        'No vibrational modes available for this document.',
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole('table', { name: 'Vibrational mode table' }),
    ).not.toBeInTheDocument();
  });

  it('shows vibrational modes in a formatted table', () => {
    render(<VibrationalModesPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />);

    const table = screen.getByRole('table', {
      name: 'Vibrational mode table',
    });
    const rows = within(table).getAllByRole('row');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Mode');
    expect(rows[0]).toHaveTextContent('Frequency (cm^-1)');
    expect(rows[0]).toHaveTextContent('IR intensity (km/mol)');
    expect(rows[0]).toHaveTextContent('Reduced mass (amu)');
    expect(rows[0]).toHaveTextContent('Force constant (mDyne/Angstrom)');

    expect(rows[1]).toHaveTextContent('Select mode 1');
    expect(rows[1]).toHaveTextContent('-530.2');
    expect(rows[1]).toHaveTextContent('Imaginary');
    expect(rows[1]).toHaveTextContent('12.3457');
    expect(rows[1]).toHaveTextContent('A1');
    expect(rows[1]).toHaveTextContent('1.2');
    expect(rows[1]).toHaveTextContent('0.3');
    expect(rows[1]).toHaveTextContent('2');

    expect(rows[2]).toHaveTextContent('Select mode 2');
    expect(rows[2]).toHaveTextContent('1628.3334');
    expect(rows[2]).toHaveTextContent('Real');
    expect(within(rows[2]).getAllByText('Unavailable')).toHaveLength(4);
    expect(rows[2]).toHaveTextContent('0');
  });

  it('shows selected mode displacement vectors by atom index', () => {
    render(<VibrationalModesPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />);

    expect(screen.getByRole('heading', { name: 'Selected Mode 1' }))
      .toBeInTheDocument();
    const displacementTable = screen.getByRole('table', {
      name: 'Selected mode displacement vectors',
    });
    const rows = within(displacementTable).getAllByRole('row');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Atom index');
    expect(rows[0]).toHaveTextContent('x');
    expect(rows[0]).toHaveTextContent('y');
    expect(rows[0]).toHaveTextContent('z');
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[1]).toHaveTextContent('-0.1');
    expect(rows[2]).toHaveTextContent('2');
    expect(rows[2]).toHaveTextContent('0.2');
    expect(rows[2]).toHaveTextContent('0.1');
    expect(
      screen.getByRole('button', { name: 'Select mode 1' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the selected mode and shows displacement empty state', () => {
    render(<VibrationalModesPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />);

    fireEvent.click(screen.getByRole('button', { name: 'Select mode 2' }));

    expect(screen.getByRole('heading', { name: 'Selected Mode 2' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select mode 2' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('table', {
        name: 'Selected mode displacement vectors',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('No displacement vectors available for selected mode.'),
    ).toBeInTheDocument();
  });

  it('can receive selected mode state from its parent', () => {
    const onSelectedModeIndexChange = vi.fn();
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        onSelectedModeIndexChange={onSelectedModeIndexChange}
        selectedModeIndex={2}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Selected Mode 2' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select mode 2' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Select mode 1' }));

    expect(onSelectedModeIndexChange).toHaveBeenCalledWith(1);
  });

  it('shows play and pause controls for selected mode animation', () => {
    const onAnimationPlayingChange = vi.fn();
    const { rerender } = render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        isAnimationPlaying={false}
        onAnimationPlayingChange={onAnimationPlayingChange}
        selectedModeIndex={1}
      />,
    );

    const playButton = screen.getByRole('button', {
      name: 'Play Mode Animation',
    });
    expect(playButton).toBeEnabled();
    expect(playButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(playButton);

    expect(onAnimationPlayingChange).toHaveBeenCalledWith(true);

    rerender(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        isAnimationPlaying
        onAnimationPlayingChange={onAnimationPlayingChange}
        selectedModeIndex={1}
      />,
    );

    const pauseButton = screen.getByRole('button', {
      name: 'Pause Mode Animation',
    });
    expect(pauseButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(pauseButton);

    expect(onAnimationPlayingChange).toHaveBeenCalledWith(false);
  });

  it('disables animation controls when selected mode has no vectors', () => {
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        onAnimationPlayingChange={vi.fn()}
        selectedModeIndex={2}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Play Mode Animation' }),
    ).toBeDisabled();
  });

  it('requests positive and negative displaced structures', () => {
    const onGenerateDisplacedStructure = vi.fn();
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        onGenerateDisplacedStructure={onGenerateDisplacedStructure}
        selectedModeIndex={1}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Generate + Displacement' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Generate - Displacement' }),
    );

    expect(onGenerateDisplacedStructure).toHaveBeenNthCalledWith(
      1,
      'positive',
    );
    expect(onGenerateDisplacedStructure).toHaveBeenNthCalledWith(
      2,
      'negative',
    );
  });

  it('requests positive and negative displaced XYZ downloads', () => {
    const onDownloadDisplacedStructure = vi.fn();
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        onDownloadDisplacedStructure={onDownloadDisplacedStructure}
        selectedModeIndex={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download + XYZ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download - XYZ' }));

    expect(onDownloadDisplacedStructure).toHaveBeenNthCalledWith(
      1,
      'positive',
    );
    expect(onDownloadDisplacedStructure).toHaveBeenNthCalledWith(
      2,
      'negative',
    );
  });

  it('disables displaced structure controls when selected mode has no vectors', () => {
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        onDownloadDisplacedStructure={vi.fn()}
        onGenerateDisplacedStructure={vi.fn()}
        selectedModeIndex={2}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Generate + Displacement' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Generate - Displacement' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Download + XYZ' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Download - XYZ' }),
    ).toBeDisabled();
  });

  it('disables displaced XYZ downloads while an export is in progress', () => {
    render(
      <VibrationalModesPanel
        document={GAUSSIAN_OUTPUT_DOCUMENT}
        isDownloadingDisplacedStructure
        onDownloadDisplacedStructure={vi.fn()}
        selectedModeIndex={1}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Download + XYZ' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Download - XYZ' }),
    ).toBeDisabled();
  });

  it('resets selected mode when the active document changes', () => {
    const secondDocument: MoleculeDocument = {
      ...GAUSSIAN_OUTPUT_DOCUMENT,
      id: 'second-gaussian-output-document',
      vibrational_modes: [
        {
          ...GAUSSIAN_OUTPUT_DOCUMENT.vibrational_modes[1],
          index: 4,
          displacements: [
            { atom_index: 1, x: 0.4, y: 0.5, z: 0.6 },
          ],
        },
      ],
    };
    const { rerender } = render(
      <VibrationalModesPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select mode 2' }));
    expect(screen.getByRole('heading', { name: 'Selected Mode 2' }))
      .toBeInTheDocument();

    rerender(<VibrationalModesPanel document={secondDocument} />);

    expect(screen.getByRole('heading', { name: 'Selected Mode 4' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select mode 4' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
