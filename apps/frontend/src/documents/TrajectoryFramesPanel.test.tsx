import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument, TrajectoryDocument } from '../shared/types';
import { TrajectoryFramesPanel } from './TrajectoryFramesPanel';

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
      gradient_norm: null,
    },
  ],
};

describe('TrajectoryFramesPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no trajectory document is loaded', () => {
    render(
      <TrajectoryFramesPanel
        document={null}
        onSelectedFrameIndexChange={() => {}}
        selectedFrameIndex={0}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Trajectory Frames' });
    expect(
      within(panel).getByText('No trajectory document loaded.'),
    ).toBeInTheDocument();
  });

  it('shows frame metadata, boundary controls, and scalar properties', () => {
    const onSelectedFrameIndexChange = vi.fn();
    const onPlaybackFramesPerSecondChange = vi.fn();
    const onPlaybackPlayingChange = vi.fn();

    render(
      <TrajectoryFramesPanel
        document={TRAJECTORY_DOCUMENT}
        isPlaybackPlaying={false}
        onPlaybackFramesPerSecondChange={onPlaybackFramesPerSecondChange}
        onPlaybackPlayingChange={onPlaybackPlayingChange}
        onSelectedFrameIndexChange={onSelectedFrameIndexChange}
        playbackFramesPerSecond={2}
        selectedFrameIndex={0}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Trajectory Frames' });
    expect(within(panel).getByText('water-optimization')).toBeInTheDocument();
    expect(within(panel).getByText('trajectory')).toBeInTheDocument();
    expect(within(panel).getByText('Frame 1 of 2')).toBeInTheDocument();
    expect(within(panel).getByText('frame-one')).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Previous Frame' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Next Frame' }),
    ).toBeEnabled();
    expect(within(panel).getByLabelText('Trajectory frame')).toHaveValue('0');
    expect(
      within(panel).getByRole('button', { name: 'Play Trajectory' }),
    ).toBeEnabled();
    expect(
      within(panel).getByRole('button', { name: 'Play Trajectory' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(panel).getByLabelText('Trajectory playback speed'),
    ).toHaveValue('2');
    expect(
      within(panel).getByRole('region', {
        name: 'Trajectory Energy Profile',
      }),
    ).toBeInTheDocument();

    const propertiesTable = within(panel).getByRole('table', {
      name: 'Selected trajectory frame properties',
    });
    expect(within(propertiesTable).getByText('energy_hartree')).toBeInTheDocument();
    expect(within(propertiesTable).getByText('-76.1')).toBeInTheDocument();
    expect(
      within(propertiesTable).getByText('normal_termination'),
    ).toBeInTheDocument();
    expect(within(propertiesTable).getByText('true')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Next Frame' }));
    expect(onSelectedFrameIndexChange).toHaveBeenCalledWith(1);

    fireEvent.click(
      within(panel).getByRole('button', { name: 'Play Trajectory' }),
    );
    expect(onPlaybackPlayingChange).toHaveBeenCalledWith(true);

    fireEvent.change(
      within(panel).getByLabelText('Trajectory playback speed'),
      {
        target: { value: '5' },
      },
    );
    expect(onPlaybackFramesPerSecondChange).toHaveBeenCalledWith(5);

    fireEvent.click(
      within(panel).getByRole('button', { name: 'Select energy frame 2' }),
    );
    expect(onSelectedFrameIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('selects frames by dropdown and formats unavailable scalar properties', () => {
    const onSelectedFrameIndexChange = vi.fn();

    render(
      <TrajectoryFramesPanel
        document={TRAJECTORY_DOCUMENT}
        isPlaybackPlaying
        onPlaybackPlayingChange={onSelectedFrameIndexChange}
        onSelectedFrameIndexChange={onSelectedFrameIndexChange}
        selectedFrameIndex={1}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Trajectory Frames' });
    expect(within(panel).getByText('Frame 2 of 2')).toBeInTheDocument();
    expect(within(panel).getByText('frame-two')).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Previous Frame' }),
    ).toBeEnabled();
    expect(
      within(panel).getByRole('button', { name: 'Next Frame' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('button', { name: 'Pause Trajectory' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByText('gradient_norm')).toBeInTheDocument();
    expect(within(panel).getByText('Unavailable')).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText('Trajectory frame'), {
      target: { value: '0' },
    });

    expect(onSelectedFrameIndexChange).toHaveBeenCalledWith(0);
  });
});
