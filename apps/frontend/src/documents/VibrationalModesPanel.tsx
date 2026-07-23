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
    modes.find((mode) => mode.index === selectedModeIndex) ??
    modes[0] ??
    null
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
    setInternalSelectedModeIndex(modes[0]?.index ?? null);
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
      style={{ marginTop: 16 }}
    >
      <h2 id="vibrational-modes-heading">Vibrational Modes</h2>
      {!document ? <p>No document loaded for vibrational modes.</p> : null}
      {document && modes.length === 0 ? (
        <p>No vibrational modes available for this document.</p>
      ) : null}
      {modes.length > 0 ? (
        <table aria-label="Vibrational mode table">
          <thead>
            <tr>
              <th scope="col">Mode</th>
              <th scope="col">Frequency (cm^-1)</th>
              <th scope="col">Type</th>
              <th scope="col">IR intensity (km/mol)</th>
              <th scope="col">Symmetry</th>
              <th scope="col">Reduced mass (amu)</th>
              <th scope="col">Force constant (mDyne/Angstrom)</th>
              <th scope="col">Displacement vectors</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((mode) => (
              <tr
                aria-selected={selectedMode?.index === mode.index}
                key={mode.index}
              >
                <th scope="row">
                  <button
                    aria-pressed={selectedMode?.index === mode.index}
                    onClick={() => selectMode(mode.index)}
                    type="button"
                  >
                    Select mode {mode.index}
                  </button>
                </th>
                <td>{formatNumber(mode.frequency_cm_minus_1)}</td>
                <td>{mode.is_imaginary ? 'Imaginary' : 'Real'}</td>
                <td>{formatOptionalNumber(mode.ir_intensity_km_per_mol)}</td>
                <td>{formatOptionalString(mode.symmetry)}</td>
                <td>{formatOptionalNumber(mode.reduced_mass_amu)}</td>
                <td>
                  {formatOptionalNumber(
                    mode.force_constant_mdyne_per_angstrom,
                  )}
                </td>
                <td>{mode.displacements.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {document ? (
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
      {selectedMode ? (
        <div style={{ marginTop: 12 }}>
          <h3>Selected Mode {selectedMode.index}</h3>
          <button
            aria-pressed={isAnimationPlaying}
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
          <button
            disabled={!canGenerateDisplacedStructure}
            onClick={() => onGenerateDisplacedStructure?.('positive')}
            style={{ marginLeft: 8 }}
            type="button"
          >
            Generate + Displacement
          </button>
          <button
            disabled={!canGenerateDisplacedStructure}
            onClick={() => onGenerateDisplacedStructure?.('negative')}
            style={{ marginLeft: 8 }}
            type="button"
          >
            Generate - Displacement
          </button>
          <button
            disabled={!canDownloadDisplacedStructure}
            onClick={() => onDownloadDisplacedStructure?.('positive')}
            style={{ marginLeft: 8 }}
            type="button"
          >
            Download + XYZ
          </button>
          <button
            disabled={!canDownloadDisplacedStructure}
            onClick={() => onDownloadDisplacedStructure?.('negative')}
            style={{ marginLeft: 8 }}
            type="button"
          >
            Download - XYZ
          </button>
          <dl>
            <dt>Frequency (cm^-1)</dt>
            <dd>{formatNumber(selectedMode.frequency_cm_minus_1)}</dd>
            <dt>Type</dt>
            <dd>{selectedMode.is_imaginary ? 'Imaginary' : 'Real'}</dd>
            <dt>Displacement vectors</dt>
            <dd>{selectedMode.displacements.length}</dd>
          </dl>
          {selectedMode.displacements.length > 0 ? (
            <table aria-label="Selected mode displacement vectors">
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
          ) : (
            <p>No displacement vectors available for selected mode.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
