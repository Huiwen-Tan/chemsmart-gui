import type { ReactNode } from 'react';

import type { TrajectoryDocument } from '../shared/types';

interface ViewerPlaybackControlsProps {
  isTrajectoryPlaybackPlaying: boolean;
  onSelectedTrajectoryFrameIndexChange: (frameIndex: number) => void;
  onTrajectoryPlaybackPlayingChange: (isPlaying: boolean) => void;
  selectedTrajectoryFrameIndex: number;
  trajectoryDocument: TrajectoryDocument | null;
}

export function ViewerPlaybackControls({
  isTrajectoryPlaybackPlaying,
  onSelectedTrajectoryFrameIndexChange,
  onTrajectoryPlaybackPlayingChange,
  selectedTrajectoryFrameIndex,
  trajectoryDocument,
}: ViewerPlaybackControlsProps): JSX.Element {
  const frameCount = trajectoryDocument?.frames.length ?? 0;
  const effectiveFrameIndex = trajectoryDocument
    ? selectedFrameIndexForDocument(
        trajectoryDocument,
        selectedTrajectoryFrameIndex,
      )
    : 0;

  return (
    <section
      aria-label="Viewer playback controls"
      className="workbench-viewer-playback"
    >
      {!trajectoryDocument ? (
        <p className="workbench-viewer-playback-empty">
          No trajectory playback available.
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
