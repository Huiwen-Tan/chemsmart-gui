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
}: ViewerPlaybackControlsProps): JSX.Element | null {
  if (!trajectoryDocument) {
    return null;
  }

  const frameCount = trajectoryDocument.frames.length;
  const effectiveFrameIndex = selectedFrameIndexForDocument(
    trajectoryDocument,
    selectedTrajectoryFrameIndex,
  );

  return (
    <section
      aria-label="Viewer playback controls"
      className="workbench-viewer-playback"
    >
      <button
        aria-label={
          isTrajectoryPlaybackPlaying ? 'Pause Trajectory' : 'Play Trajectory'
        }
        aria-pressed={isTrajectoryPlaybackPlaying}
        className="workbench-viewer-playback-main-button"
        disabled={frameCount <= 1}
        onClick={() => {
          onTrajectoryPlaybackPlayingChange(!isTrajectoryPlaybackPlaying);
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
        disabled={frameCount <= 1}
        onClick={() => {
          onSelectedTrajectoryFrameIndexChange(
            wrappedFrameIndex(effectiveFrameIndex - 1, frameCount),
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
            const frameNumber = Number(event.currentTarget.value);
            if (Number.isInteger(frameNumber) && frameNumber >= 1) {
              onSelectedTrajectoryFrameIndexChange(
                wrappedFrameIndex(frameNumber - 1, frameCount),
              );
            }
          }}
          type="number"
          value={effectiveFrameIndex + 1}
        />
        <span className="workbench-viewer-frame-total">of {frameCount}</span>
      </label>
      <button
        aria-label="Next Frame"
        className="workbench-viewer-playback-step-button"
        disabled={frameCount <= 1}
        onClick={() => {
          onSelectedTrajectoryFrameIndexChange(
            wrappedFrameIndex(effectiveFrameIndex + 1, frameCount),
          );
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="workbench-viewer-playback-icon-next"
        />
      </button>
    </section>
  );
}

function selectedFrameIndexForDocument(
  document: TrajectoryDocument,
  selectedFrameIndex: number,
): number {
  if (
    Number.isInteger(selectedFrameIndex) &&
    selectedFrameIndex >= 0 &&
    selectedFrameIndex < document.frames.length
  ) {
    return selectedFrameIndex;
  }
  return 0;
}

function wrappedFrameIndex(frameIndex: number, frameCount: number): number {
  if (frameCount <= 0) {
    return 0;
  }
  return ((frameIndex % frameCount) + frameCount) % frameCount;
}
