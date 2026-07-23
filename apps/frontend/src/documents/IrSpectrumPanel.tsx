import type { KeyboardEvent } from 'react';

import type { MoleculeDocument } from '../shared/types';

interface IrSpectrumPanelProps {
  document: MoleculeDocument | null;
  selectedModeIndex: number | null;
  onSelectedModeIndexChange?: (modeIndex: number) => void;
}

interface IrPeak {
  frequencyCmMinus1: number;
  intensityKmPerMol: number;
  modeIndex: number;
}

const CHART_HEIGHT = 180;
const CHART_WIDTH = 520;
const PLOT_BOTTOM = 138;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 496;
const PLOT_TOP = 20;

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

export function IrSpectrumPanel({
  document,
  selectedModeIndex,
  onSelectedModeIndexChange,
}: IrSpectrumPanelProps): JSX.Element {
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

  return (
    <section
      aria-labelledby="ir-stick-spectrum-heading"
      style={{ marginTop: 16 }}
    >
      <h3 id="ir-stick-spectrum-heading">IR Stick Spectrum</h3>
      {!document ? <p>No document loaded for IR spectrum.</p> : null}
      {document && peaks.length === 0 ? (
        <p>No positive ir_intensity_km_per_mol values available.</p>
      ) : null}
      {document && peaks.length > 0 ? (
        <>
          <dl>
            <dt>Frequency field</dt>
            <dd>frequency_cm_minus_1</dd>
            <dt>IR intensity field</dt>
            <dd>ir_intensity_km_per_mol</dd>
            <dt>Frequency unit</dt>
            <dd>cm^-1</dd>
            <dt>IR intensity unit</dt>
            <dd>km/mol</dd>
            <dt>IR peaks</dt>
            <dd>{peaks.length}</dd>
            <dt>Selected IR peak</dt>
            <dd>
              {selectedPeak
                ? `Mode ${selectedPeak.modeIndex}: ` +
                  `${formatNumber(selectedPeak.frequencyCmMinus1)} cm^-1, ` +
                  `${formatNumber(selectedPeak.intensityKmPerMol)} km/mol`
                : 'Unavailable'}
            </dd>
          </dl>
          <svg
            aria-label="IR stick spectrum chart"
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
              Wavenumber (cm^-1)
            </text>
            <text fill="#cbd5e1" fontSize="12" x="8" y="16">
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
                    stroke={isSelected ? '#fbbf24' : '#38bdf8'}
                    strokeWidth={isSelected ? 4 : 3}
                    x1={x}
                    x2={x}
                    y1={PLOT_BOTTOM}
                    y2={y}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    fill={isSelected ? '#fbbf24' : '#38bdf8'}
                    r={isSelected ? 5 : 4}
                    stroke={isSelected ? '#f8fafc' : '#0f172a'}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
          <table aria-label="IR stick spectrum peaks" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">frequency_cm_minus_1 (cm^-1)</th>
                <th scope="col">ir_intensity_km_per_mol (km/mol)</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {peaks.map((peak) => {
                const isSelected = peak.modeIndex === selectedModeIndex;
                return (
                  <tr aria-selected={isSelected} key={peak.modeIndex}>
                    <th scope="row">
                      <button
                        aria-pressed={isSelected}
                        onClick={() => selectPeak(peak.modeIndex)}
                        type="button"
                      >
                        Select IR mode {peak.modeIndex}
                      </button>
                    </th>
                    <td>{formatNumber(peak.frequencyCmMinus1)}</td>
                    <td>{formatNumber(peak.intensityKmPerMol)}</td>
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
