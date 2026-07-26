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

const DEFAULT_PROPS = {
  isTrajectoryPlaybackPlaying: false,
  onSelectedTrajectoryFrameIndexChange: vi.fn(),
  onTrajectoryPlaybackPlayingChange: vi.fn(),
  selectedTrajectoryFrameIndex: 0,
  trajectoryDocument: null,
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
    })).toHaveTextContent('No trajectory playback available.');
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
    expect(
      within(playback).getByLabelText('Viewer trajectory frame'),
    ).toHaveValue(1);
    expect(playback).toHaveTextContent('of 2');
    expect(
      within(playback).getByRole('button', { name: 'Previous Frame' }),
    ).toBeDisabled();
    expect(
      within(playback).queryByLabelText('Viewer trajectory playback speed'),
    ).not.toBeInTheDocument();
    expect(
      within(playback).queryByRole('button', {
        name: 'Advanced playback settings',
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(playback).getByRole('button', { name: 'Next Frame' }),
    );
    fireEvent.change(within(playback).getByLabelText('Viewer trajectory frame'), {
      target: { value: '2' },
    });
    fireEvent.click(
      within(playback).getByRole('button', { name: 'Play Trajectory' }),
    );

    expect(DEFAULT_PROPS.onSelectedTrajectoryFrameIndexChange)
      .toHaveBeenCalledWith(1);
    expect(DEFAULT_PROPS.onSelectedTrajectoryFrameIndexChange)
      .toHaveBeenCalledTimes(2);
    expect(DEFAULT_PROPS.onTrajectoryPlaybackPlayingChange)
      .toHaveBeenCalledWith(true);
  });
});
