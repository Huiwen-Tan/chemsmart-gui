import type { Atom, MoleculeDocument } from '../shared/types';
import { useViewerStore } from '../state/useViewerStore';

interface SelectedAtomPanelProps {
  document: MoleculeDocument | null;
}

const RAD_TO_DEGREES = 180 / Math.PI;

function calculateAngleDegrees(
  firstAtom: Atom,
  vertexAtom: Atom,
  thirdAtom: Atom,
): number | null {
  const firstVector = {
    x: firstAtom.x - vertexAtom.x,
    y: firstAtom.y - vertexAtom.y,
    z: firstAtom.z - vertexAtom.z,
  };
  const thirdVector = {
    x: thirdAtom.x - vertexAtom.x,
    y: thirdAtom.y - vertexAtom.y,
    z: thirdAtom.z - vertexAtom.z,
  };
  const firstLength = Math.hypot(
    firstVector.x,
    firstVector.y,
    firstVector.z,
  );
  const thirdLength = Math.hypot(
    thirdVector.x,
    thirdVector.y,
    thirdVector.z,
  );
  if (firstLength === 0 || thirdLength === 0) {
    return null;
  }

  const dotProduct =
    firstVector.x * thirdVector.x +
    firstVector.y * thirdVector.y +
    firstVector.z * thirdVector.z;
  const cosine = dotProduct / (firstLength * thirdLength);
  return Math.acos(Math.min(1, Math.max(-1, cosine))) * RAD_TO_DEGREES;
}

export function SelectedAtomPanel({
  document,
}: SelectedAtomPanelProps): JSX.Element {
  const selectedAtomIndices = useViewerStore(
    (state) => state.selectedAtomIndices,
  );
  const atomsByIndex = new Map(
    document?.atoms.map((atom) => [atom.index, atom]) ?? [],
  );
  const selectedAtoms = selectedAtomIndices.flatMap((atomIndex) => {
    const atom = atomsByIndex.get(atomIndex);
    return atom ? [atom] : [];
  });
  const distanceMeasurement = document && selectedAtoms.length === 2
    ? {
        firstAtom: selectedAtoms[0],
        secondAtom: selectedAtoms[1],
        value: Math.hypot(
          selectedAtoms[1].x - selectedAtoms[0].x,
          selectedAtoms[1].y - selectedAtoms[0].y,
          selectedAtoms[1].z - selectedAtoms[0].z,
        ),
        unit: document.coordinate_unit,
      }
    : null;
  const angleValue = selectedAtoms.length === 3
    ? calculateAngleDegrees(selectedAtoms[0], selectedAtoms[1], selectedAtoms[2])
    : null;
  const angleMeasurement = angleValue !== null
    ? {
        firstAtom: selectedAtoms[0],
        vertexAtom: selectedAtoms[1],
        thirdAtom: selectedAtoms[2],
        value: angleValue,
      }
    : null;

  return (
    <section
      aria-labelledby="selected-atoms-heading"
      style={{ marginTop: 16 }}
    >
      <h2 id="selected-atoms-heading">Selected Atoms</h2>
      {selectedAtoms.length === 0 ? (
        <p>Select an atom to inspect its metadata.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: 420 }}>
          <caption style={{ textAlign: 'left', marginBottom: 8 }}>
            Coordinates ({document?.coordinate_unit})
          </caption>
          <thead>
            <tr>
              <th scope="col">Atom</th>
              <th scope="col">X</th>
              <th scope="col">Y</th>
              <th scope="col">Z</th>
            </tr>
          </thead>
          <tbody>
            {selectedAtoms.map((atom) => (
              <tr key={atom.index}>
                <th scope="row">{atom.index} {atom.element}</th>
                <td>{atom.x.toFixed(3)}</td>
                <td>{atom.y.toFixed(3)}</td>
                <td>{atom.z.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {distanceMeasurement ? (
        <p>
          <strong>Distance:</strong>{' '}
          {distanceMeasurement.firstAtom.index}{' '}
          {distanceMeasurement.firstAtom.element} -{' '}
          {distanceMeasurement.secondAtom.index}{' '}
          {distanceMeasurement.secondAtom.element} ={' '}
          {distanceMeasurement.value.toFixed(3)} {distanceMeasurement.unit}
        </p>
      ) : null}
      {angleMeasurement ? (
        <p>
          <strong>Angle:</strong> {angleMeasurement.firstAtom.index}{' '}
          {angleMeasurement.firstAtom.element} -{' '}
          {angleMeasurement.vertexAtom.index}{' '}
          {angleMeasurement.vertexAtom.element} -{' '}
          {angleMeasurement.thirdAtom.index}{' '}
          {angleMeasurement.thirdAtom.element} ={' '}
          {angleMeasurement.value.toFixed(3)} degrees
        </p>
      ) : null}
    </section>
  );
}
