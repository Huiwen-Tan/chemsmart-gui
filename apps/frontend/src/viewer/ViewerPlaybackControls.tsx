import type { ReactNode } from 'react';

import type { TrajectoryDocument, VibrationalMode } from '../shared/types';

interface ViewerPlaybackControlsProps {
  isTrajectoryPlaybackPlaying: boolean;
  isVibrationalModeAnimationPlaying: boolean;
  onSelectedTrajectoryFrameIndexChange: (frameIndex: number) => void;
  onSelectedVibrationalModeIndexChange: (modeIndex: number) => void;
  onTrajectoryPlaybackFramesPerSecondChange: (
    framesPerSecond: number,
  ) => void;
  onTrajectoryPlaybackPlayingChange: (isPlaying: boolean) => void;
  onVibrationalModeAnimationPlayingChange: (isPlaying: boolean) => void;
  playbackFramesPerSecond: number;
  selectedTrajectoryFrameIndex: number;
  selectedVibrationalMode: VibrationalMode | null;
  trajectoryDocument: TrajectoryDocument | null;
  vibrationalModes: readonly VibrationalMode[];
}

const PLAYBACK_SPEED_OPTIONS = [1, 2, 5, 10];

export function ViewerPlaybackControls({
  isTrajectoryPlaybackPlaying,
  isVibrationalModeAnimationPlaying,
  onSelectedTrajectoryFrameIndexChange,
  onSelectedVibrationalModeIndexChange,
  onTrajectoryPlaybackFramesPerSecondChange,
  onTrajectoryPlaybackPlayingChange,
  onVibrationalModeAnimationPlayingChange,
  playbackFramesPerSecond,
  selectedTrajectoryFrameIndex,
  selectedVibrationalMode,
  trajectoryDocument,
  vibrationalModes,
}: ViewerPlaybackControlsProps): JSX.Element {
  const frameCount = trajectoryDocument?.frames.length ?? 0;
  const effectiveFrameIndex = trajectoryDocument
    ? selectedFrameIndexForDocument(
        trajectoryDocument,
        selectedTrajectoryFrameIndex,
      )
    : 0;
  const selectedMode = selectedVibrationalMode ?? vibrationalModes[0] ?? null;
  const hasPlaybackSurface =
    trajectoryDocument !== null || selectedMode !== null;

  return (
    <section
      aria-label="Viewer playback controls"
      className="workbench-viewer-playback"
    >
      {!hasPlaybackSurface ? (
        <p className="workbench-viewer-playback-empty">
          No trajectory or vibrational playback available.
        </p>
      ) : null}
      {trajectoryDocument ? (
        <PlaybackGroup label="Trajectory">
          <p className="workbench-viewer-playback-status">
            Frame {effectiveFrameIndex + 1} of {frameCount}
          </p>
          <button
            className="workbench-viewer-playback-button"
            disabled={effectiveFrameIndex === 0}
            onClick={() => {
              selectTrajectoryFrame(
                effectiveFrameIndex - 1,
                frameCount,
                onSelectedTrajectoryFrameIndexChange,
              );
            }}
            type="button"
          >
            Previous Frame
          </button>
          <label className="workbench-viewer-playback-field">
            Frame
            <select
              aria-label="Viewer trajectory frame"
              className="workbench-viewer-playback-select"
              onChange={(event) => {
                selectTrajectoryFrame(
                  Number(event.currentTarget.value),
                  frameCount,
                  onSelectedTrajectoryFrameIndexChange,
                );
              }}
              value={effectiveFrameIndex}
            >
              {trajectoryDocument.frames.map((frame, frameIndex) => (
                <option key={frame.id} value={frameIndex}>
                  {frameIndex + 1}
                </option>
              ))}
            </select>
          </label>
          <button
            className="workbench-viewer-playback-button"
            disabled={effectiveFrameIndex >= frameCount - 1}
            onClick={() => {
              selectTrajectoryFrame(
                effectiveFrameIndex + 1,
                frameCount,
                onSelectedTrajectoryFrameIndexChange,
              );
            }}
            type="button"
          >
            Next Frame
          </button>
          <button
            aria-pressed={isTrajectoryPlaybackPlaying}
            className="workbench-viewer-playback-button"
            disabled={frameCount <= 1}
            onClick={() => {
              onTrajectoryPlaybackPlayingChange(!isTrajectoryPlaybackPlaying);
            }}
            type="button"
          >
            {isTrajectoryPlaybackPlaying
              ? 'Pause Trajectory'
              : 'Play Trajectory'}
          </button>
          <label className="workbench-viewer-playback-field">
            Speed
            <select
              aria-label="Viewer trajectory playback speed"
              className="workbench-viewer-playback-select"
              onChange={(event) => {
                onTrajectoryPlaybackFramesPerSecondChange(
                  Number(event.currentTarget.value),
                );
              }}
              value={playbackFramesPerSecond}
            >
              {PLAYBACK_SPEED_OPTIONS.map((framesPerSecond) => (
                <option key={framesPerSecond} value={framesPerSecond}>
                  {framesPerSecond} fps
                </option>
              ))}
            </select>
          </label>
        </PlaybackGroup>
      ) : null}
      {selectedMode ? (
        <PlaybackGroup label="Vibration">
          <p className="workbench-viewer-playback-status">
            {formatModeSummary(selectedMode)}
          </p>
          <label className="workbench-viewer-playback-field">
            Mode
            <select
              aria-label="Viewer vibrational mode"
              className="workbench-viewer-playback-select"
              onChange={(event) => {
                onSelectedVibrationalModeIndexChange(
                  Number(event.currentTarget.value),
                );
              }}
              value={selectedMode.index}
            >
              {vibrationalModes.map((mode) => (
                <option key={mode.index} value={mode.index}>
                  {mode.index}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={isVibrationalModeAnimationPlaying}
            className="workbench-viewer-playback-button"
            disabled={selectedMode.displacements.length === 0}
            onClick={() => {
              onVibrationalModeAnimationPlayingChange(
                !isVibrationalModeAnimationPlaying,
              );
            }}
            type="button"
          >
            {isVibrationalModeAnimationPlaying
              ? 'Pause Mode Animation'
              : 'Play Mode Animation'}
          </button>
          {selectedMode.displacements.length === 0 ? (
            <p className="workbench-viewer-playback-hint">
              No displacement vectors available.
            </p>
          ) : null}
        </PlaybackGroup>
      ) : null}
    </section>
  );
}

interface PlaybackGroupProps {
  children: ReactNode;
  label: string;
}

function PlaybackGroup({ children, label }: PlaybackGroupProps): JSX.Element {
  return (
    <div
      aria-label={`${label} playback`}
      className="workbench-viewer-playback-group"
    >
      <p className="workbench-viewer-playback-label">{label}</p>
      <div className="workbench-viewer-playback-items">{children}</div>
    </div>
  );
}

function selectedFrameIndexForDocument(
  document: TrajectoryDocument,
  selectedFrameIndex: number,
): number {
  if (selectedFrameIndex < 0 || selectedFrameIndex >= document.frames.length) {
    return 0;
  }
  return selectedFrameIndex;
}

function selectTrajectoryFrame(
  frameIndex: number,
  frameCount: number,
  onSelectedTrajectoryFrameIndexChange: (frameIndex: number) => void,
): void {
  if (frameIndex < 0 || frameIndex >= frameCount) {
    return;
  }

  onSelectedTrajectoryFrameIndexChange(frameIndex);
}

function formatModeSummary(mode: VibrationalMode): string {
  const imaginaryLabel = mode.is_imaginary ? ' (imaginary)' : '';
  return (
    `Mode ${mode.index}: ${mode.frequency_cm_minus_1.toFixed(1)} cm^-1` +
    imaginaryLabel
  );
}
