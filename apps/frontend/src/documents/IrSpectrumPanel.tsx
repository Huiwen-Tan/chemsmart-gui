import { useState, type KeyboardEvent } from 'react';

import type {
  BroadenedIrSpectrumOptions,
  BroadenedIrSpectrumResponse,
  IrSpectrumBroadening,
  IrSpectrumPoint,
  MoleculeDocument,
} from '../shared/types';

interface IrSpectrumPanelProps {
  broadenedSpectrum?: BroadenedIrSpectrumResponse | null;
  broadenedSpectrumError?: string | null;
  document: MoleculeDocument | null;
  isBroadenedSpectrumLoading?: boolean;
  onBroadenedSpectrumPreview?: (
    options: BroadenedIrSpectrumOptions,
  ) => void;
  selectedModeIndex: number | null;
  onSelectedModeIndexChange?: (modeIndex: number) => void;
}

interface IrPeak {
  frequencyCmMinus1: number;
  intensityKmPerMol: number;
  modeIndex: number;
}

const CHART_HEIGHT = 220;
const CHART_WIDTH = 960;
const PLOT_BOTTOM = 176;
const PLOT_LEFT = 64;
const PLOT_RIGHT = 936;
const PLOT_TOP = 24;
const DEFAULT_BROADENED_POINT_COUNT = 121;
const DEFAULT_BROADENING_WIDTH_CM_MINUS_1 = '20';

function formatNumber(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '');
}

function irPeaksForDocument(document: MoleculeDocument): IrPeak[] {
  return document.vibrational_modes.flatMap((mode) => {
    const intensity = mode.ir_intensity_km_per_mol;
    if (
      intensity === null ||
      intensity <= 0 ||
      !Number.isFinite(intensity) ||
      !Number.isFinite(mode.frequency_cm_minus_1)
    ) {
      return [];
    }
    return [
      {
        frequencyCmMinus1: mode.frequency_cm_minus_1,
        intensityKmPerMol: intensity,
        modeIndex: mode.index,
      },
    ];
  });
}

function chartXForPeak(
  peak: IrPeak,
  minFrequency: number,
  maxFrequency: number,
): number {
  if (minFrequency === maxFrequency) {
    return (PLOT_LEFT + PLOT_RIGHT) / 2;
  }
  return (
    PLOT_LEFT +
    ((PLOT_RIGHT - PLOT_LEFT) *
      (peak.frequencyCmMinus1 - minFrequency)) /
      (maxFrequency - minFrequency)
  );
}

function chartYForPeak(peak: IrPeak, maxIntensity: number): number {
  if (maxIntensity <= 0) {
    return PLOT_BOTTOM;
  }
  return (
    PLOT_BOTTOM -
    ((PLOT_BOTTOM - PLOT_TOP) * peak.intensityKmPerMol) / maxIntensity
  );
}

function chartXForSpectrumPoint(
  point: IrSpectrumPoint,
  minWavenumber: number,
  maxWavenumber: number,
): number {
  if (minWavenumber === maxWavenumber) {
    return (PLOT_LEFT + PLOT_RIGHT) / 2;
  }
  return (
    PLOT_LEFT +
    ((PLOT_RIGHT - PLOT_LEFT) *
      (point.wavenumber_cm_minus_1 - minWavenumber)) /
      (maxWavenumber - minWavenumber)
  );
}

function chartYForSpectrumPoint(
  point: IrSpectrumPoint,
  maxIntensity: number,
): number {
  if (maxIntensity <= 0) {
    return PLOT_BOTTOM;
  }
  return (
    PLOT_BOTTOM -
    ((PLOT_BOTTOM - PLOT_TOP) * point.intensity_km_per_mol) / maxIntensity
  );
}

function spectrumCurvePointString(points: IrSpectrumPoint[]): string {
  const wavenumbers = points.map((point) => point.wavenumber_cm_minus_1);
  const intensities = points.map((point) => point.intensity_km_per_mol);
  const minWavenumber = Math.min(...wavenumbers);
  const maxWavenumber = Math.max(...wavenumbers);
  const maxIntensity = Math.max(...intensities);
  return points
    .map((point) => (
      `${chartXForSpectrumPoint(point, minWavenumber, maxWavenumber)},` +
      `${chartYForSpectrumPoint(point, maxIntensity)}`
    ))
    .join(' ');
}

export function IrSpectrumPanel({
  broadenedSpectrum = null,
  broadenedSpectrumError = null,
  document,
  isBroadenedSpectrumLoading = false,
  onBroadenedSpectrumPreview,
  selectedModeIndex,
  onSelectedModeIndexChange,
}: IrSpectrumPanelProps): JSX.Element {
  const [selectedBroadening, setSelectedBroadening] =
    useState<IrSpectrumBroadening>('gaussian');
  const [widthCmMinus1Text, setWidthCmMinus1Text] = useState(
    DEFAULT_BROADENING_WIDTH_CM_MINUS_1,
  );
  const peaks = document ? irPeaksForDocument(document) : [];
  const frequencyValues = peaks.map((peak) => peak.frequencyCmMinus1);
  const intensityValues = peaks.map((peak) => peak.intensityKmPerMol);
  const minFrequency = peaks.length > 0 ? Math.min(...frequencyValues) : 0;
  const maxFrequency = peaks.length > 0 ? Math.max(...frequencyValues) : 0;
  const maxIntensity = peaks.length > 0 ? Math.max(...intensityValues) : 0;
  const selectedPeak =
    peaks.find((peak) => peak.modeIndex === selectedModeIndex) ?? null;

  const selectPeak = (modeIndex: number): void => {
    onSelectedModeIndexChange?.(modeIndex);
  };
  const widthCmMinus1 = Number(widthCmMinus1Text);
  const canPreviewBroadenedSpectrum =
    peaks.length > 0 &&
    onBroadenedSpectrumPreview !== undefined &&
    Number.isFinite(widthCmMinus1) &&
    widthCmMinus1 > 0 &&
    !isBroadenedSpectrumLoading;

  const handlePeakKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    modeIndex: number,
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectPeak(modeIndex);
  };

  const handlePeakRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    modeIndex: number,
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectPeak(modeIndex);
  };

  return (
    <section
      aria-labelledby="ir-stick-spectrum-heading"
      className="workbench-result-panel"
    >
      <h3 id="ir-stick-spectrum-heading">IR Stick Spectrum</h3>
      {!document ? <p>No document loaded for IR spectrum.</p> : null}
      {document && peaks.length === 0 ? (
        <p>No positive ir_intensity_km_per_mol values available.</p>
      ) : null}
      {document && peaks.length > 0 ? (
        <>
          <dl className="workbench-metadata-list">
            <dt>IR peaks</dt>
            <dd>{peaks.length}</dd>
            <dt>Selected IR peak</dt>
            <dd>
              {selectedPeak
                ? `Mode ${selectedPeak.modeIndex}: ` +
                  `${formatNumber(selectedPeak.frequencyCmMinus1)} cm⁻¹, ` +
                  `${formatNumber(selectedPeak.intensityKmPerMol)} km/mol`
                : 'Unavailable'}
            </dd>
          </dl>
          <svg
            aria-label="IR stick spectrum chart"
            className="workbench-chart"
            role="img"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <line
              className="workbench-chart-axis"
              x1={PLOT_LEFT}
              x2={PLOT_LEFT}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
            />
            <line
              className="workbench-chart-axis"
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={PLOT_BOTTOM}
              y2={PLOT_BOTTOM}
            />
            <text
              className="workbench-chart-label"
              fontSize="12"
              x={PLOT_LEFT}
              y="208"
            >
              Wavenumber (cm⁻¹)
            </text>
            <text
              className="workbench-chart-label"
              fontSize="12"
              x="8"
              y="18"
            >
              Intensity (km/mol)
            </text>
            {peaks.map((peak) => {
              const isSelected = peak.modeIndex === selectedModeIndex;
              const x = chartXForPeak(peak, minFrequency, maxFrequency);
              const y = chartYForPeak(peak, maxIntensity);
              return (
                <g
                  aria-label={`Select IR peak mode ${peak.modeIndex}`}
                  key={peak.modeIndex}
                  onClick={() => selectPeak(peak.modeIndex)}
                  onKeyDown={(event) => {
                    handlePeakKeyDown(event, peak.modeIndex);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <line
                    className={
                      isSelected
                        ? 'workbench-chart-series-selected'
                        : 'workbench-chart-series-primary'
                    }
                    strokeWidth={isSelected ? 4 : 3}
                    x1={x}
                    x2={x}
                    y1={PLOT_BOTTOM}
                    y2={y}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    className={
                      isSelected
                        ? 'workbench-chart-series-selected'
                        : 'workbench-chart-series-primary'
                    }
                    r={isSelected ? 5 : 4}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
          <div className="workbench-result-table-scroll">
            <table
              aria-label="IR stick spectrum peaks"
              className="workbench-data-table"
            >
              <thead>
                <tr>
                  <th scope="col">Mode</th>
                  <th scope="col">Frequency (cm⁻¹)</th>
                  <th scope="col">IR intensity (km/mol)</th>
                </tr>
              </thead>
              <tbody>
                {peaks.map((peak) => {
                  const isSelected = peak.modeIndex === selectedModeIndex;
                  return (
                    <tr
                      aria-label={
                        `IR mode ${peak.modeIndex}, frequency ` +
                        `${formatNumber(peak.frequencyCmMinus1)} cm⁻¹`
                      }
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      key={peak.modeIndex}
                      onClick={() => selectPeak(peak.modeIndex)}
                      onKeyDown={(event) => {
                        handlePeakRowKeyDown(event, peak.modeIndex);
                      }}
                      tabIndex={0}
                    >
                      <th scope="row">{peak.modeIndex}</th>
                      <td>{formatNumber(peak.frequencyCmMinus1)}</td>
                      <td>{formatNumber(peak.intensityKmPerMol)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <section
            aria-labelledby="broadened-ir-spectrum-heading"
            className="workbench-result-section"
          >
            <h4 id="broadened-ir-spectrum-heading">
              Broadened IR Spectrum
            </h4>
            <div className="workbench-control-row">
              <label>
                Broadening
                <select
                  aria-label="IR spectrum broadening"
                  onChange={(event) => {
                    setSelectedBroadening(
                      event.currentTarget.value as IrSpectrumBroadening,
                    );
                  }}
                  value={selectedBroadening}
                >
                  <option value="gaussian">Gaussian</option>
                  <option value="lorentzian">Lorentzian</option>
                </select>
              </label>
              <label>
                Width (cm⁻¹)
                <input
                  aria-label="IR broadening width"
                  min="0.1"
                  onChange={(event) => {
                    setWidthCmMinus1Text(event.currentTarget.value);
                  }}
                  step="0.1"
                  type="number"
                  value={widthCmMinus1Text}
                />
              </label>
              <button
                disabled={!canPreviewBroadenedSpectrum}
                onClick={() => {
                  onBroadenedSpectrumPreview?.({
                    broadening: selectedBroadening,
                    point_count: DEFAULT_BROADENED_POINT_COUNT,
                    width_cm_minus_1: widthCmMinus1,
                  });
                }}
                type="button"
              >
                Preview Broadened Spectrum
              </button>
            </div>
            {!Number.isFinite(widthCmMinus1) || widthCmMinus1 <= 0 ? (
              <p className="workbench-error" role="alert">
                IR broadening width must be greater than zero.
              </p>
            ) : null}
            {isBroadenedSpectrumLoading ? (
              <p>Generating broadened IR spectrum...</p>
            ) : null}
            {broadenedSpectrumError ? (
              <p className="workbench-error" role="alert">
                Error: {broadenedSpectrumError}
              </p>
            ) : null}
            {broadenedSpectrum ? (
              <>
                <dl className="workbench-metadata-list">
                  <dt>Broadening</dt>
                  <dd>{broadenedSpectrum.broadening}</dd>
                  <dt>Width (cm⁻¹)</dt>
                  <dd>{formatNumber(broadenedSpectrum.width_cm_minus_1)}</dd>
                  <dt>Curve points</dt>
                  <dd>{broadenedSpectrum.points.length}</dd>
                  <dt>Source peaks</dt>
                  <dd>{broadenedSpectrum.peaks.length}</dd>
                </dl>
                <svg
                  aria-label="Broadened IR spectrum chart"
                  className="workbench-chart"
                  role="img"
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                >
                  <line
                    className="workbench-chart-axis"
                    x1={PLOT_LEFT}
                    x2={PLOT_LEFT}
                    y1={PLOT_TOP}
                    y2={PLOT_BOTTOM}
                  />
                  <line
                    className="workbench-chart-axis"
                    x1={PLOT_LEFT}
                    x2={PLOT_RIGHT}
                    y1={PLOT_BOTTOM}
                    y2={PLOT_BOTTOM}
                  />
                  <text
                    className="workbench-chart-label"
                    fontSize="12"
                    x={PLOT_LEFT}
                    y="208"
                  >
                    Wavenumber (cm⁻¹)
                  </text>
                  <text
                    className="workbench-chart-label"
                    fontSize="12"
                    x="8"
                    y="18"
                  >
                    Intensity (km/mol)
                  </text>
                  <polyline
                    className="workbench-chart-series-analysis"
                    fill="none"
                    points={spectrumCurvePointString(
                      broadenedSpectrum.points,
                    )}
                    strokeWidth="2"
                  />
                </svg>
              </>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
}
