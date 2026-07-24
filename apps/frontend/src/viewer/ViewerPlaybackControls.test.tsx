import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  MoleculeDocument,
  TrajectoryDocument,
  VibrationalMode,
} from '../shared/types';
import { ViewerPlaybackControls } from './ViewerPlaybackControls';

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
  ],
  bonds: [{ atom1: 1, atom2: 2 }],
  frozen_atom_indices: [],
  vibrational_modes: [],
} satisfies MoleculeDocument;

const TRAJECTORY = {
  id: 'trajectory',
  name: 'water-optimization',
  document_kind: 'trajectory',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  frames: [
    WATER,
    {
      ...WATER,
      id: 'water-frame-two',
      name: 'water-frame-two',
    },
  ],
  frame_properties: [{}, {}],
} satisfies TrajectoryDocument;

const IMAGINARY_MODE = {
  index: 1,
  frequency_cm_minus_1: -530.2,
  is_imaginary: true,
  reduced_mass_amu: null,
  force_constant_mdyne_per_angstrom: null,
  ir_intensity_km_per_mol: 12.3,
  symmetry: null,
  displacements: [{ atom_index: 1, x: 0, y: 0, z: -0.1 }],
} satisfies VibrationalMode;

const REAL_MODE_WITHOUT_DISPLACEMENTS = {
  ...IMAGINARY_MODE,
  index: 2,
  frequency_cm_minus_1: 1628.3334,
  is_imaginary: false,
  displacements: [],
} satisfies VibrationalMode;

const DEFAULT_PROPS = {
  isTrajectoryPlaybackPlaying: false,
  isVibrationalModeAnimationPlaying: false,
  onSelectedTrajectoryFrameIndexChange: vi.fn(),
  onSelectedVibrationalModeIndexChange: vi.fn(),
  onTrajectoryPlaybackFramesPerSecondChange: vi.fn(),
  onTrajectoryPlaybackPlayingChange: vi.fn(),
  onVibrationalModeAnimationPlayingChange: vi.fn(),
  playbackFramesPerSecond: 2,
  selectedTrajectoryFrameIndex: 0,
  selectedVibrationalMode: null,
  trajectoryDocument: null,
  vibrationalModes: [],
};

describe('ViewerPlaybackControls', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows an explicit empty playback state', () => {
    render(<ViewerPlaybackControls {...DEFAULT_PROPS} />);

    expect(screen.getByRole('region', {
      name: 'Viewer playback controls',
    })).toHaveTextContent('No trajectory or vibrational playback available.');
  });

  it('runs trajectory frame and playback controls', () => {
    render(
      <ViewerPlaybackControls
        {...DEFAULT_PROPS}
        selectedTrajectoryFrameIndex={0}
        trajectoryDocument={TRAJECTORY}
      />,
    );

    const playback = screen.getByRole('region', {
      name: 'Viewer playback controls',
    });
    expect(playback).toHaveTextContent('Frame 1 of 2');
    expect(
      within(playback).getByRole('button', { name: 'Previous Frame' }),
    ).toBeDisabled();

    fireEvent.click(
      within(playback).getByRole('button', { name: 'Next Frame' }),
    );
    fireEvent.click(
      within(playback).getByRole('button', { name: 'Play Trajectory' }),
    );
    fireEvent.change(
      within(playback).getByLabelText('Viewer trajectory playback speed'),
      { target: { value: '5' } },
    );

    expect(DEFAULT_PROPS.onSelectedTrajectoryFrameIndexChange)
      .toHaveBeenCalledWith(1);
    expect(DEFAULT_PROPS.onTrajectoryPlaybackPlayingChange)
      .toHaveBeenCalledWith(true);
    expect(DEFAULT_PROPS.onTrajectoryPlaybackFramesPerSecondChange)
      .toHaveBeenCalledWith(5);
  });

  it('runs vibrational mode selection and animation controls', () => {
    render(
      <ViewerPlaybackControls
        {...DEFAULT_PROPS}
        selectedVibrationalMode={IMAGINARY_MODE}
        vibrationalModes={[IMAGINARY_MODE, REAL_MODE_WITHOUT_DISPLACEMENTS]}
      />,
    );

    const playback = screen.getByRole('region', {
      name: 'Viewer playback controls',
    });
    expect(playback).toHaveTextContent('Mode 1: -530.2 cm^-1 (imaginary)');

    fireEvent.change(
      within(playback).getByLabelText('Viewer vibrational mode'),
      {
        target: { value: '2' },
      },
    );
    fireEvent.click(
      within(playback).getByRole('button', {
        name: 'Play Mode Animation',
      }),
    );

    expect(DEFAULT_PROPS.onSelectedVibrationalModeIndexChange)
      .toHaveBeenCalledWith(2);
    expect(DEFAULT_PROPS.onVibrationalModeAnimationPlayingChange)
      .toHaveBeenCalledWith(true);
  });

  it('disables mode animation when displacement vectors are unavailable', () => {
    render(
      <ViewerPlaybackControls
        {...DEFAULT_PROPS}
        selectedVibrationalMode={REAL_MODE_WITHOUT_DISPLACEMENTS}
        vibrationalModes={[REAL_MODE_WITHOUT_DISPLACEMENTS]}
      />,
    );

    const playback = screen.getByRole('region', {
      name: 'Viewer playback controls',
    });
    expect(
      within(playback).getByRole('button', {
        name: 'Play Mode Animation',
      }),
    ).toBeDisabled();
    expect(playback).toHaveTextContent('No displacement vectors available.');
  });
});
