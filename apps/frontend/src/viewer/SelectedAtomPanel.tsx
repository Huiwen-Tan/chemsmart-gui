import type { Atom, MoleculeDocument } from '../shared/types';
import { useViewerStore } from '../state/useViewerStore';

interface SelectedAtomPanelProps {
  document: MoleculeDocument | null;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

const GEOMETRY_EPSILON = 1e-12;
const RAD_TO_DEGREES = 180 / Math.PI;

function subtractVectors(first: Vector3, second: Vector3): Vector3 {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

function scaleVector(vector: Vector3, scale: number): Vector3 {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  };
}

function dotProduct(first: Vector3, second: Vector3): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function crossProduct(first: Vector3, second: Vector3): Vector3 {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function vectorLength(vector: Vector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalizeVector(vector: Vector3): Vector3 | null {
  const length = vectorLength(vector);
  if (length <= GEOMETRY_EPSILON) {
    return null;
  }

  return scaleVector(vector, 1 / length);
}

function calculateAngleDegrees(
  firstAtom: Atom,
  vertexAtom: Atom,
  thirdAtom: Atom,
): number | null {
  const firstVector = subtractVectors(firstAtom, vertexAtom);
  const thirdVector = subtractVectors(thirdAtom, vertexAtom);
  const firstLength = vectorLength(firstVector);
  const thirdLength = vectorLength(thirdVector);
  if (firstLength <= GEOMETRY_EPSILON || thirdLength <= GEOMETRY_EPSILON) {
    return null;
  }

  const cosine = dotProduct(firstVector, thirdVector) /
    (firstLength * thirdLength);
  return Math.acos(Math.min(1, Math.max(-1, cosine))) * RAD_TO_DEGREES;
}

function calculateDihedralDegrees(
  firstAtom: Atom,
  secondAtom: Atom,
  thirdAtom: Atom,
  fourthAtom: Atom,
): number | null {
  const firstBond = scaleVector(subtractVectors(secondAtom, firstAtom), -1);
  const secondBond = subtractVectors(thirdAtom, secondAtom);
  const thirdBond = subtractVectors(fourthAtom, thirdAtom);
  const secondBondUnit = normalizeVector(secondBond);
  if (!secondBondUnit) {
    return null;
  }

  const firstPlaneVector = subtractVectors(
    firstBond,
    scaleVector(secondBondUnit, dotProduct(firstBond, secondBondUnit)),
  );
  const secondPlaneVector = subtractVectors(
    thirdBond,
    scaleVector(secondBondUnit, dotProduct(thirdBond, secondBondUnit)),
  );
  if (
    vectorLength(firstPlaneVector) <= GEOMETRY_EPSILON ||
    vectorLength(secondPlaneVector) <= GEOMETRY_EPSILON
  ) {
    return null;
  }

  const xValue = dotProduct(firstPlaneVector, secondPlaneVector);
  const yValue = dotProduct(
    crossProduct(secondBondUnit, firstPlaneVector),
    secondPlaneVector,
  );
  return Math.atan2(yValue, xValue) * RAD_TO_DEGREES;
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
  const dihedralValue = selectedAtoms.length === 4
    ? calculateDihedralDegrees(
        selectedAtoms[0],
        selectedAtoms[1],
        selectedAtoms[2],
        selectedAtoms[3],
      )
    : null;
  const dihedralMeasurement = dihedralValue !== null
    ? {
        firstAtom: selectedAtoms[0],
        secondAtom: selectedAtoms[1],
        thirdAtom: selectedAtoms[2],
        fourthAtom: selectedAtoms[3],
        value: dihedralValue,
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
      {dihedralMeasurement ? (
        <p>
          <strong>Dihedral:</strong> {dihedralMeasurement.firstAtom.index}{' '}
          {dihedralMeasurement.firstAtom.element} -{' '}
          {dihedralMeasurement.secondAtom.index}{' '}
          {dihedralMeasurement.secondAtom.element} -{' '}
          {dihedralMeasurement.thirdAtom.index}{' '}
          {dihedralMeasurement.thirdAtom.element} -{' '}
          {dihedralMeasurement.fourthAtom.index}{' '}
          {dihedralMeasurement.fourthAtom.element} ={' '}
          {dihedralMeasurement.value.toFixed(3)} degrees
        </p>
      ) : null}
    </section>
  );
}
