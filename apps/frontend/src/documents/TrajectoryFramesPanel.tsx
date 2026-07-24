import type { JsonScalar, TrajectoryDocument } from '../shared/types';
import { TrajectoryEnergyProfile } from './TrajectoryEnergyProfile';

interface TrajectoryFramesPanelProps {
  document: TrajectoryDocument | null;
  isPlaybackPlaying?: boolean;
  onPlaybackPlayingChange?: (isPlaying: boolean) => void;
  selectedFrameIndex: number;
  onSelectedFrameIndexChange: (frameIndex: number) => void;
}

function formatScalarValue(value: JsonScalar): string {
  return value === null ? 'Unavailable' : String(value);
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

export function TrajectoryFramesPanel({
  document,
  isPlaybackPlaying = false,
  onPlaybackPlayingChange,
  selectedFrameIndex,
  onSelectedFrameIndexChange,
}: TrajectoryFramesPanelProps): JSX.Element {
  const effectiveFrameIndex = document
    ? selectedFrameIndexForDocument(document, selectedFrameIndex)
    : 0;
  const selectedFrame = document?.frames[effectiveFrameIndex] ?? null;
  const selectedFrameProperties =
    document?.frame_properties[effectiveFrameIndex] ?? {};
  const selectedFramePropertyEntries = Object.entries(
    selectedFrameProperties,
  );
  const frameCount = document?.frames.length ?? 0;
  const canPlay = frameCount > 1 && onPlaybackPlayingChange !== undefined;

  const selectFrame = (frameIndex: number): void => {
    if (!document || frameIndex < 0 || frameIndex >= document.frames.length) {
      return;
    }
    onSelectedFrameIndexChange(frameIndex);
  };

  return (
    <section
      aria-labelledby="trajectory-frames-heading"
      style={{ marginTop: 16 }}
    >
      <h2 id="trajectory-frames-heading">Trajectory Frames</h2>
      {!document ? <p>No trajectory document loaded.</p> : null}
      {document && selectedFrame ? (
        <>
          <dl>
            <dt>Name</dt>
            <dd>{document.name}</dd>
            <dt>Document kind</dt>
            <dd>{document.document_kind}</dd>
            <dt>Frames</dt>
            <dd>{frameCount}</dd>
            <dt>Selected frame</dt>
            <dd>
              Frame {effectiveFrameIndex + 1} of {frameCount}
            </dd>
            <dt>Selected frame document</dt>
            <dd>{selectedFrame.name}</dd>
          </dl>
          <div>
            <button
              disabled={effectiveFrameIndex === 0}
              onClick={() => selectFrame(effectiveFrameIndex - 1)}
              type="button"
            >
              Previous Frame
            </button>
            <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
              Frame
              <select
                aria-label="Trajectory frame"
                onChange={(event) => {
                  selectFrame(Number(event.currentTarget.value));
                }}
                value={effectiveFrameIndex}
              >
                {document.frames.map((frame, frameIndex) => (
                  <option key={frame.id} value={frameIndex}>
                    Frame {frameIndex + 1}: {frame.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={effectiveFrameIndex === frameCount - 1}
              onClick={() => selectFrame(effectiveFrameIndex + 1)}
              style={{ marginLeft: 8 }}
              type="button"
            >
              Next Frame
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              aria-pressed={isPlaybackPlaying}
              disabled={!canPlay}
              onClick={() => {
                onPlaybackPlayingChange?.(!isPlaybackPlaying);
              }}
              type="button"
            >
              {isPlaybackPlaying ? 'Pause Trajectory' : 'Play Trajectory'}
            </button>
          </div>
          <TrajectoryEnergyProfile
            document={document}
            onSelectedFrameIndexChange={selectFrame}
            selectedFrameIndex={effectiveFrameIndex}
          />
          <h3>Frame Properties</h3>
          {selectedFramePropertyEntries.length > 0 ? (
            <table aria-label="Selected trajectory frame properties">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedFramePropertyEntries.map(([propertyName, value]) => (
                  <tr key={propertyName}>
                    <th scope="row">{propertyName}</th>
                    <td>{formatScalarValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No scalar frame properties available.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
