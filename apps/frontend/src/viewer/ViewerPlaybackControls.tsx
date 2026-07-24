import type { ReactNode } from 'react';

import type { TrajectoryDocument, VibrationalMode } from '../shared/types';

interface ViewerPlaybackControlsProps {
  isTrajectoryPlaybackPlaying: boolean;
  isVibrationalModeAnimationPlaying: boolean;
  onSelectedTrajectoryFrameIndexChange: (frameIndex: number) => void;
  onSelectedVibrationalModeIndexChange: (modeIndex: number) => void;
  onTrajectoryPlaybackPlayingChange: (isPlaying: boolean) => void;
  onVibrationalModeAnimationPlayingChange: (isPlaying: boolean) => void;
  selectedTrajectoryFrameIndex: number;
  selectedVibrationalMode: VibrationalMode | null;
  trajectoryDocument: TrajectoryDocument | null;
  vibrationalModes: readonly VibrationalMode[];
}

export function ViewerPlaybackControls({
  isTrajectoryPlaybackPlaying,
  isVibrationalModeAnimationPlaying,
  onSelectedTrajectoryFrameIndexChange,
  onSelectedVibrationalModeIndexChange,
  onTrajectoryPlaybackPlayingChange,
  onVibrationalModeAnimationPlayingChange,
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
          <div className="workbench-viewer-playback-strip">
            <button
              aria-label={
                isTrajectoryPlaybackPlaying
                  ? 'Pause Trajectory'
                  : 'Play Trajectory'
              }
              aria-pressed={isTrajectoryPlaybackPlaying}
              className="workbench-viewer-playback-main-button"
              disabled={frameCount <= 1}
              onClick={() => {
                onTrajectoryPlaybackPlayingChange(
                  !isTrajectoryPlaybackPlaying,
                );
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={
                  isTrajectoryPlaybackPlaying
                    ? 'workbench-viewer-playback-icon-pause'
                    : 'workbench-viewer-playback-icon-play'
                }
              />
            </button>
            <button
              aria-label="Previous Frame"
              className="workbench-viewer-playback-step-button"
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
              <span
                aria-hidden="true"
                className="workbench-viewer-playback-icon-previous"
              />
            </button>
            <label className="workbench-viewer-frame-control">
              <input
                aria-label="Viewer trajectory frame"
                className="workbench-viewer-frame-input"
                max={frameCount}
                min={1}
                onChange={(event) => {
                  selectTrajectoryFrame(
                    Number(event.currentTarget.value) - 1,
                    frameCount,
                    onSelectedTrajectoryFrameIndexChange,
                  );
                }}
                type="number"
                value={effectiveFrameIndex + 1}
              />
              <span className="workbench-viewer-frame-total">
                of {frameCount}
              </span>
            </label>
            <button
              aria-label="Next Frame"
              className="workbench-viewer-playback-step-button"
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
              <span
                aria-hidden="true"
                className="workbench-viewer-playback-icon-next"
              />
            </button>
          </div>
        </PlaybackGroup>
      ) : null}
      {selectedMode ? (
        <PlaybackGroup label="Vibration">
          <div className="workbench-viewer-playback-strip">
            <button
              aria-label={
                isVibrationalModeAnimationPlaying
                  ? 'Pause Mode Animation'
                  : 'Play Mode Animation'
              }
              aria-pressed={isVibrationalModeAnimationPlaying}
              className="workbench-viewer-playback-main-button"
              disabled={selectedMode.displacements.length === 0}
              onClick={() => {
                onVibrationalModeAnimationPlayingChange(
                  !isVibrationalModeAnimationPlaying,
                );
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={
                  isVibrationalModeAnimationPlaying
                    ? 'workbench-viewer-playback-icon-pause'
                    : 'workbench-viewer-playback-icon-play'
                }
              />
            </button>
            <label className="workbench-viewer-frame-control">
              <span className="workbench-viewer-frame-total">Mode</span>
              <select
                aria-label="Viewer vibrational mode"
                className="workbench-viewer-mode-select"
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
            <span className="workbench-viewer-mode-frequency">
              {formatModeFrequency(selectedMode)}
            </span>
          </div>
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

function formatModeFrequency(mode: VibrationalMode): string {
  const imaginaryLabel = mode.is_imaginary ? ' imag' : '';
  return `${mode.frequency_cm_minus_1.toFixed(1)} cm^-1${imaginaryLabel}`;
}
