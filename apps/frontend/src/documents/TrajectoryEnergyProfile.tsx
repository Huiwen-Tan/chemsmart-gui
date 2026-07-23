import type { TrajectoryDocument } from '../shared/types';

interface TrajectoryEnergyProfileProps {
  document: TrajectoryDocument | null;
  selectedFrameIndex: number;
  onSelectedFrameIndexChange?: (frameIndex: number) => void;
}

interface EnergyPoint {
  frameIndex: number;
  energyHartree: number;
}

const CHART_HEIGHT = 180;
const CHART_WIDTH = 520;
const PLOT_BOTTOM = 138;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 496;
const PLOT_TOP = 20;

function formatEnergyHartree(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '');
}

function energyPointsForDocument(
  document: TrajectoryDocument,
): EnergyPoint[] {
  return document.frame_properties.flatMap((frameProperties, frameIndex) => {
    const energyHartree = frameProperties.energy_hartree;
    if (
      typeof energyHartree !== 'number' ||
      !Number.isFinite(energyHartree)
    ) {
      return [];
    }
    return [{ energyHartree, frameIndex }];
  });
}

function chartXForPoint(
  point: EnergyPoint,
  frameCount: number,
): number {
  if (frameCount <= 1) {
    return (PLOT_LEFT + PLOT_RIGHT) / 2;
  }
  return (
    PLOT_LEFT +
    ((PLOT_RIGHT - PLOT_LEFT) * point.frameIndex) / (frameCount - 1)
  );
}

function chartYForPoint(
  point: EnergyPoint,
  minEnergyHartree: number,
  maxEnergyHartree: number,
): number {
  if (minEnergyHartree === maxEnergyHartree) {
    return (PLOT_TOP + PLOT_BOTTOM) / 2;
  }
  return (
    PLOT_BOTTOM -
    ((PLOT_BOTTOM - PLOT_TOP) *
      (point.energyHartree - minEnergyHartree)) /
      (maxEnergyHartree - minEnergyHartree)
  );
}

function pointCoordinateString(
  points: EnergyPoint[],
  frameCount: number,
  minEnergyHartree: number,
  maxEnergyHartree: number,
): string {
  return points
    .map((point) => (
      `${chartXForPoint(point, frameCount)},` +
      `${chartYForPoint(point, minEnergyHartree, maxEnergyHartree)}`
    ))
    .join(' ');
}

export function TrajectoryEnergyProfile({
  document,
  selectedFrameIndex,
  onSelectedFrameIndexChange,
}: TrajectoryEnergyProfileProps): JSX.Element {
  const energyPoints = document ? energyPointsForDocument(document) : [];
  const selectedEnergyPoint =
    energyPoints.find((point) => point.frameIndex === selectedFrameIndex) ??
    null;
  const minEnergyHartree = Math.min(
    ...energyPoints.map((point) => point.energyHartree),
  );
  const maxEnergyHartree = Math.max(
    ...energyPoints.map((point) => point.energyHartree),
  );
  const frameCount = document?.frames.length ?? 0;

  return (
    <section
      aria-labelledby="trajectory-energy-profile-heading"
      style={{ marginTop: 16 }}
    >
      <h3 id="trajectory-energy-profile-heading">
        Trajectory Energy Profile
      </h3>
      {!document ? <p>No trajectory document loaded for energy profile.</p> : null}
      {document && energyPoints.length === 0 ? (
        <p>No numeric energy_hartree values available for this trajectory.</p>
      ) : null}
      {document && energyPoints.length > 0 ? (
        <>
          <dl>
            <dt>Energy field</dt>
            <dd>energy_hartree</dd>
            <dt>Energy unit</dt>
            <dd>Hartree</dd>
            <dt>Plotted frames</dt>
            <dd>{energyPoints.length}</dd>
            <dt>Selected frame energy_hartree</dt>
            <dd>
              {selectedEnergyPoint
                ? formatEnergyHartree(selectedEnergyPoint.energyHartree)
                : 'Unavailable'}
            </dd>
          </dl>
          <svg
            aria-label="Trajectory energy profile chart"
            role="img"
            style={{
              background: '#101826',
              border: '1px solid #2d3748',
              borderRadius: 8,
              display: 'block',
              height: 'auto',
              maxWidth: 560,
              width: '100%',
            }}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <line
              stroke="#64748b"
              x1={PLOT_LEFT}
              x2={PLOT_LEFT}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
            />
            <line
              stroke="#64748b"
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={PLOT_BOTTOM}
              y2={PLOT_BOTTOM}
            />
            <text fill="#cbd5e1" fontSize="12" x={PLOT_LEFT} y="166">
              Frame
            </text>
            <text fill="#cbd5e1" fontSize="12" x="8" y="16">
              Energy (Hartree)
            </text>
            {energyPoints.length > 1 ? (
              <polyline
                fill="none"
                points={pointCoordinateString(
                  energyPoints,
                  frameCount,
                  minEnergyHartree,
                  maxEnergyHartree,
                )}
                stroke="#60a5fa"
                strokeWidth="2"
              />
            ) : null}
            {energyPoints.map((point) => {
              const isSelected = point.frameIndex === selectedFrameIndex;
              return (
                <circle
                  aria-label={`Energy point frame ${point.frameIndex + 1}`}
                  cx={chartXForPoint(point, frameCount)}
                  cy={chartYForPoint(
                    point,
                    minEnergyHartree,
                    maxEnergyHartree,
                  )}
                  fill={isSelected ? '#fbbf24' : '#60a5fa'}
                  key={point.frameIndex}
                  r={isSelected ? 6 : 4}
                  stroke={isSelected ? '#f8fafc' : '#1e3a8a'}
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          <table
            aria-label="Trajectory energy values"
            style={{ marginTop: 8 }}
          >
            <thead>
              <tr>
                <th scope="col">Frame</th>
                <th scope="col">energy_hartree (Hartree)</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {energyPoints.map((point) => {
                const isSelected = point.frameIndex === selectedFrameIndex;
                return (
                  <tr aria-selected={isSelected} key={point.frameIndex}>
                    <th scope="row">
                      <button
                        aria-pressed={isSelected}
                        onClick={() => {
                          onSelectedFrameIndexChange?.(point.frameIndex);
                        }}
                        type="button"
                      >
                        Select energy frame {point.frameIndex + 1}
                      </button>
                    </th>
                    <td>{formatEnergyHartree(point.energyHartree)}</td>
                    <td>{isSelected ? 'Selected' : 'Not selected'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
