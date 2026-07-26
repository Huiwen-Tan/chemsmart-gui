import { useEffect, useState } from 'react';

import type {
  BroadenedIrSpectrumOptions,
  BroadenedIrSpectrumResponse,
  ModeDisplacementDirection,
  MoleculeDocument,
  VibrationalMode,
} from '../shared/types';
import { IrSpectrumPanel } from './IrSpectrumPanel';

interface VibrationalModesPanelProps {
  broadenedSpectrum?: BroadenedIrSpectrumResponse | null;
  broadenedSpectrumError?: string | null;
  document: MoleculeDocument | null;
  isAnimationPlaying?: boolean;
  isBroadenedSpectrumLoading?: boolean;
  onAnimationPlayingChange?: (isPlaying: boolean) => void;
  onBroadenedSpectrumPreview?: (
    options: BroadenedIrSpectrumOptions,
  ) => void;
  selectedModeIndex?: number | null;
  onSelectedModeIndexChange?: (modeIndex: number) => void;
  isGeneratingDisplacedStructure?: boolean;
  onGenerateDisplacedStructure?: (
    direction: ModeDisplacementDirection,
  ) => void;
  isDownloadingDisplacedStructure?: boolean;
  onDownloadDisplacedStructure?: (
    direction: ModeDisplacementDirection,
  ) => void;
  onShowDisplacementVectorsChange?: (showVectors: boolean) => void;
  showDisplacementVectors?: boolean;
  showIrSpectrum?: boolean;
}

function formatNumber(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '');
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? 'Unavailable' : formatNumber(value);
}

function formatOptionalString(value: string | null): string {
  return value === null || value.length === 0 ? 'Unavailable' : value;
}

function selectedModeFromIndex(
  modes: VibrationalMode[],
  selectedModeIndex: number | null,
): VibrationalMode | null {
  return (
    modes.find((mode) => mode.index === selectedModeIndex) ?? null
  );
}

export function VibrationalModesPanel({
  broadenedSpectrum = null,
  broadenedSpectrumError = null,
  document,
  isAnimationPlaying = false,
  isBroadenedSpectrumLoading = false,
  onAnimationPlayingChange,
  onBroadenedSpectrumPreview,
  selectedModeIndex,
  onSelectedModeIndexChange,
  isGeneratingDisplacedStructure = false,
  onGenerateDisplacedStructure,
  isDownloadingDisplacedStructure = false,
  onDownloadDisplacedStructure,
  onShowDisplacementVectorsChange,
  showDisplacementVectors = false,
  showIrSpectrum = true,
}: VibrationalModesPanelProps): JSX.Element {
  const modes = document?.vibrational_modes ?? [];
  const [
    internalSelectedModeIndex,
    setInternalSelectedModeIndex,
  ] = useState<number | null>(null);
  const modeIndexSignature = modes.map((mode) => mode.index).join(',');
  const activeSelectedModeIndex =
    selectedModeIndex ?? internalSelectedModeIndex;
  const selectedMode = selectedModeFromIndex(modes, activeSelectedModeIndex);

  useEffect(() => {
    setInternalSelectedModeIndex(null);
  }, [document?.id, modeIndexSignature]);

  const selectMode = (modeIndex: number): void => {
    setInternalSelectedModeIndex(modeIndex);
    onSelectedModeIndexChange?.(modeIndex);
  };
  const canGenerateDisplacedStructure =
    selectedMode !== null &&
    selectedMode.displacements.length > 0 &&
    !isGeneratingDisplacedStructure &&
    onGenerateDisplacedStructure !== undefined;
  const canDownloadDisplacedStructure =
    selectedMode !== null &&
    selectedMode.displacements.length > 0 &&
    !isDownloadingDisplacedStructure &&
    onDownloadDisplacedStructure !== undefined;

  return (
    <section
      aria-labelledby="vibrational-modes-heading"
      className="workbench-result-panel workbench-vibration-panel"
    >
      <h2 id="vibrational-modes-heading">Vibrational Modes</h2>
      {!document ? <p>No document loaded for vibrational modes.</p> : null}
      {document && modes.length === 0 ? (
        <p>No vibrational modes available for this document.</p>
      ) : null}
      {modes.length > 0 ? (
        <div className="workbench-vibration-mode-table">
          <table
            aria-label="Vibrational mode table"
            className="workbench-data-table"
          >
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">Frequency (cm⁻¹)</th>
                <th scope="col">IR intensity (km/mol)</th>
                <th scope="col">Type</th>
                <th scope="col">Symmetry</th>
              </tr>
            </thead>
            <tbody>
              {modes.map((mode) => (
                <tr
                  data-selected={selectedMode?.index === mode.index}
                  key={mode.index}
                >
                  <th scope="row">
                    <button
                      aria-label={`Select mode ${mode.index}`}
                      aria-pressed={selectedMode?.index === mode.index}
                      onClick={() => selectMode(mode.index)}
                      type="button"
                    >
                      {mode.index}
                    </button>
                  </th>
                  <td>{formatNumber(mode.frequency_cm_minus_1)}</td>
                  <td>{formatOptionalNumber(mode.ir_intensity_km_per_mol)}</td>
                  <td>{mode.is_imaginary ? 'Imaginary' : 'Real'}</td>
                  <td>{formatOptionalString(mode.symmetry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {selectedMode ? (
        <section className="workbench-result-section workbench-vibration-controls">
          <div className="workbench-vibration-controls-header">
            <div>
              <h3>Mode {selectedMode.index}</h3>
              <p className="workbench-vibration-frequency">
                {formatNumber(selectedMode.frequency_cm_minus_1)} cm⁻¹
                {selectedMode.is_imaginary ? ' · Imaginary' : ''}
              </p>
            </div>
            <button
              aria-pressed={isAnimationPlaying}
              className="workbench-button workbench-button-primary workbench-vibration-play-button"
              disabled={selectedMode.displacements.length === 0}
              onClick={() => {
                onAnimationPlayingChange?.(!isAnimationPlaying);
              }}
              type="button"
            >
              {isAnimationPlaying
                ? 'Pause Mode Animation'
                : 'Play Mode Animation'}
            </button>
          </div>
          <label className="workbench-inline-control">
            <input
              checked={showDisplacementVectors}
              disabled={selectedMode.displacements.length === 0}
              onChange={(event) => {
                onShowDisplacementVectorsChange?.(event.currentTarget.checked);
              }}
              type="checkbox"
            />
            Show displacement vectors
          </label>
          <dl className="workbench-metadata-list">
            <dt>IR intensity (km/mol)</dt>
            <dd>{formatOptionalNumber(selectedMode.ir_intensity_km_per_mol)}</dd>
            <dt>Reduced mass (amu)</dt>
            <dd>{formatOptionalNumber(selectedMode.reduced_mass_amu)}</dd>
            <dt>Force constant (mDyne/Å)</dt>
            <dd>
              {formatOptionalNumber(
                selectedMode.force_constant_mdyne_per_angstrom,
              )}
            </dd>
            <dt>Displacement vectors</dt>
            <dd>{selectedMode.displacements.length}</dd>
          </dl>
          <details className="workbench-vibration-details">
            <summary>Structure and displacement data</summary>
            <div className="workbench-action-row">
              <button
                disabled={!canGenerateDisplacedStructure}
                onClick={() => onGenerateDisplacedStructure?.('positive')}
                type="button"
              >
                Generate Forward (+Q)
              </button>
              <button
                disabled={!canGenerateDisplacedStructure}
                onClick={() => onGenerateDisplacedStructure?.('negative')}
                type="button"
              >
                Generate Backward (−Q)
              </button>
              <button
                disabled={!canDownloadDisplacedStructure}
                onClick={() => onDownloadDisplacedStructure?.('positive')}
                type="button"
              >
                Download +Q as XYZ
              </button>
              <button
                disabled={!canDownloadDisplacedStructure}
                onClick={() => onDownloadDisplacedStructure?.('negative')}
                type="button"
              >
                Download −Q as XYZ
              </button>
            </div>
            {selectedMode.displacements.length > 0 ? (
              <div className="workbench-vibration-displacement-table">
                <table
                  aria-label="Selected mode displacement vectors"
                  className="workbench-data-table"
                >
                  <thead>
                    <tr>
                      <th scope="col">Atom index</th>
                      <th scope="col">x</th>
                      <th scope="col">y</th>
                      <th scope="col">z</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMode.displacements.map((displacement) => (
                      <tr key={displacement.atom_index}>
                        <th scope="row">{displacement.atom_index}</th>
                        <td>{formatNumber(displacement.x)}</td>
                        <td>{formatNumber(displacement.y)}</td>
                        <td>{formatNumber(displacement.z)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No displacement vectors available for selected mode.</p>
            )}
          </details>
        </section>
      ) : modes.length > 0 ? (
        <p className="workbench-vibration-selection-hint">
          Select a mode to inspect or animate it in the molecular viewer.
        </p>
      ) : null}
      {document && showIrSpectrum ? (
        <IrSpectrumPanel
          broadenedSpectrum={broadenedSpectrum}
          broadenedSpectrumError={broadenedSpectrumError}
          document={document}
          isBroadenedSpectrumLoading={isBroadenedSpectrumLoading}
          onBroadenedSpectrumPreview={onBroadenedSpectrumPreview}
          onSelectedModeIndexChange={selectMode}
          selectedModeIndex={selectedMode?.index ?? null}
        />
      ) : null}
    </section>
  );
}
