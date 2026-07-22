import type { MoleculeDocument } from '../shared/types';

interface VibrationalModesPanelProps {
  document: MoleculeDocument | null;
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

export function VibrationalModesPanel({
  document,
}: VibrationalModesPanelProps): JSX.Element {
  const modes = document?.vibrational_modes ?? [];

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
              <tr key={mode.index}>
                <th scope="row">{mode.index}</th>
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
    </section>
  );
}
