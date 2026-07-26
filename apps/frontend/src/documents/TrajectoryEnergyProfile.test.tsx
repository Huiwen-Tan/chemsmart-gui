import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument, TrajectoryDocument } from '../shared/types';
import { TrajectoryEnergyProfile } from './TrajectoryEnergyProfile';

const FRAME_ONE: MoleculeDocument = {
  id: 'frame-one',
  name: 'frame-one',
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
};

const FRAME_TWO: MoleculeDocument = {
  ...FRAME_ONE,
  id: 'frame-two',
  name: 'frame-two',
  atoms: [
    FRAME_ONE.atoms[0],
    { index: 2, element: 'H', x: 0.8, y: 0.6, z: 0.1 },
  ],
};

const FRAME_THREE: MoleculeDocument = {
  ...FRAME_ONE,
  id: 'frame-three',
  name: 'frame-three',
  atoms: [
    FRAME_ONE.atoms[0],
    { index: 2, element: 'H', x: 0.84, y: 0.64, z: 0.12 },
  ],
};

const TRAJECTORY_DOCUMENT: TrajectoryDocument = {
  id: 'trajectory-document',
  name: 'water-optimization',
  document_kind: 'trajectory',
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
  frames: [FRAME_ONE, FRAME_TWO],
  frame_properties: [
    {
      energy_hartree: -76.1,
      normal_termination: true,
    },
    {
      energy_hartree: -76.2,
      step_index: 2,
    },
  ],
};

describe('TrajectoryEnergyProfile', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no trajectory document is loaded', () => {
    render(
      <TrajectoryEnergyProfile
        document={null}
        selectedFrameIndex={0}
      />,
    );

    const profile = screen.getByRole('region', {
      name: 'Trajectory Energy Profile',
    });
    expect(
      within(profile).getByText(
        'No trajectory document loaded for energy profile.',
      ),
    ).toBeInTheDocument();
  });

  it('shows energy values in parser-provided frame order', () => {
    render(
      <TrajectoryEnergyProfile
        document={TRAJECTORY_DOCUMENT}
        selectedFrameIndex={0}
      />,
    );

    const profile = screen.getByRole('region', {
      name: 'Trajectory Energy Profile',
    });
    expect(
      within(profile).getByRole('img', {
        name: 'Trajectory energy profile chart',
      }),
    ).toBeInTheDocument();
    expect(within(profile).getByText('Energy unit')).toBeInTheDocument();
    expect(within(profile).getByText('Hartree')).toBeInTheDocument();
    expect(within(profile).getByText('2')).toBeInTheDocument();

    const energyTable = within(profile).getByRole('table', {
      name: 'Trajectory energy values',
    });
    const rows = within(energyTable).getAllByRole('row');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Frame');
    expect(rows[0]).toHaveTextContent('Energy (Hartree)');
    expect(rows[1]).toHaveTextContent('Select energy frame 1');
    expect(rows[1]).toHaveTextContent('-76.1');
    expect(
      within(rows[1]).getByRole('button', { name: 'Select energy frame 1' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(rows[2]).toHaveTextContent('Select energy frame 2');
    expect(rows[2]).toHaveTextContent('-76.2');
    expect(
      within(rows[2]).getByRole('button', { name: 'Select energy frame 2' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects a frame from the energy table', () => {
    const onSelectedFrameIndexChange = vi.fn();
    render(
      <TrajectoryEnergyProfile
        document={TRAJECTORY_DOCUMENT}
        onSelectedFrameIndexChange={onSelectedFrameIndexChange}
        selectedFrameIndex={0}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Select energy frame 2' }),
    );

    expect(onSelectedFrameIndexChange).toHaveBeenCalledWith(1);
  });

  it('skips missing energy values and reports unavailable selected energy', () => {
    const documentWithMissingEnergy: TrajectoryDocument = {
      ...TRAJECTORY_DOCUMENT,
      frames: [FRAME_ONE, FRAME_TWO, FRAME_THREE],
      frame_properties: [
        {
          energy_hartree: -76.1,
        },
        {
          energy_hartree: null,
        },
        {
          gradient_norm: 0.3,
        },
      ],
    };

    render(
      <TrajectoryEnergyProfile
        document={documentWithMissingEnergy}
        selectedFrameIndex={1}
      />,
    );

    const profile = screen.getByRole('region', {
      name: 'Trajectory Energy Profile',
    });
    const energyTable = within(profile).getByRole('table', {
      name: 'Trajectory energy values',
    });
    const rows = within(energyTable).getAllByRole('row');

    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('Select energy frame 1');
    expect(rows[1]).toHaveTextContent('-76.1');
    expect(
      within(profile).getByText('Selected frame energy'),
    ).toBeInTheDocument();
    expect(within(profile).getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows an energy-specific empty state when no frames have energy', () => {
    render(
      <TrajectoryEnergyProfile
        document={{
          ...TRAJECTORY_DOCUMENT,
          frame_properties: [{ normal_termination: true }, {}],
        }}
        selectedFrameIndex={0}
      />,
    );

    const profile = screen.getByRole('region', {
      name: 'Trajectory Energy Profile',
    });
    expect(
      within(profile).getByText(
        'No numeric energy values are available for this trajectory.',
      ),
    ).toBeInTheDocument();
    expect(
      within(profile).queryByRole('table', {
        name: 'Trajectory energy values',
      }),
    ).not.toBeInTheDocument();
  });
});
