import { type FormEvent, useEffect, useState } from 'react';

import type { Atom, Bond, MoleculeDocument } from '../shared/types';
import { useDocumentStore } from '../state/useDocumentStore';
import { useViewerStore } from '../state/useViewerStore';

interface SelectedAtomPanelProps {
  document: MoleculeDocument | null;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CoordinateDraft {
  x: string;
  y: string;
  z: string;
}

interface AddAtomDraft {
  element: string;
  x: string;
  y: string;
  z: string;
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

function bondMatches(
  bond: Bond,
  atom1Index: number,
  atom2Index: number,
): boolean {
  return (
    (bond.atom1 === atom1Index && bond.atom2 === atom2Index) ||
    (bond.atom1 === atom2Index && bond.atom2 === atom1Index)
  );
}

export function SelectedAtomPanel({
  document,
}: SelectedAtomPanelProps): JSX.Element {
  const applyMoleculeEditCommand = useDocumentStore(
    (state) => state.applyMoleculeEditCommand,
  );
  const isApplyingMoleculeEdit = useDocumentStore(
    (state) => state.isApplyingMoleculeEdit,
  );
  const moleculeEditError = useDocumentStore(
    (state) => state.moleculeEditError,
  );
  const selectedAtomIndices = useViewerStore(
    (state) => state.selectedAtomIndices,
  );
  const clearAtomSelection = useViewerStore(
    (state) => state.clearAtomSelection,
  );
  const atomsByIndex = new Map(
    document?.atoms.map((atom) => [atom.index, atom]) ?? [],
  );
  const selectedAtoms = selectedAtomIndices.flatMap((atomIndex) => {
    const atom = atomsByIndex.get(atomIndex);
    return atom ? [atom] : [];
  });
  const singleSelectedAtom = selectedAtoms.length === 1
    ? selectedAtoms[0]
    : null;
  const [coordinateDraft, setCoordinateDraft] = useState<CoordinateDraft>({
    x: '',
    y: '',
    z: '',
  });
  const [coordinateEditError, setCoordinateEditError] = useState<string | null>(
    null,
  );
  const [distanceDraft, setDistanceDraft] = useState('');
  const [distanceEditError, setDistanceEditError] = useState<string | null>(
    null,
  );
  const [addAtomDraft, setAddAtomDraft] = useState<AddAtomDraft>({
    element: 'H',
    x: '0',
    y: '0',
    z: '0',
  });
  const [atomEditError, setAtomEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!singleSelectedAtom) {
      setCoordinateDraft({ x: '', y: '', z: '' });
      setCoordinateEditError(null);
      return;
    }

    setCoordinateDraft({
      x: String(singleSelectedAtom.x),
      y: String(singleSelectedAtom.y),
      z: String(singleSelectedAtom.z),
    });
    setCoordinateEditError(null);
  }, [
    singleSelectedAtom?.index,
    singleSelectedAtom?.x,
    singleSelectedAtom?.y,
    singleSelectedAtom?.z,
  ]);

  const submitCoordinateEdit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!document || !singleSelectedAtom) {
      return;
    }

    const position = {
      x: Number(coordinateDraft.x),
      y: Number(coordinateDraft.y),
      z: Number(coordinateDraft.z),
    };
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      setCoordinateEditError('Coordinates must be finite numbers.');
      return;
    }

    setCoordinateEditError(null);
    void applyMoleculeEditCommand({
      command_type: 'set_atom_position',
      document_id: document.id,
      atom_index: singleSelectedAtom.index,
      position,
      coordinate_unit: document.coordinate_unit,
    });
  };
  const updateCoordinateDraft = (
    field: keyof CoordinateDraft,
    value: string,
  ): void => {
    setCoordinateDraft((draft) => ({
      ...draft,
      [field]: value,
    }));
  };
  const updateAddAtomDraft = (
    field: keyof AddAtomDraft,
    value: string,
  ): void => {
    setAddAtomDraft((draft) => ({
      ...draft,
      [field]: value,
    }));
  };
  const submitAddAtomEdit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!document) {
      return;
    }

    const element = addAtomDraft.element.trim();
    if (!element) {
      setAtomEditError('Atom element is required.');
      return;
    }

    const position = {
      x: Number(addAtomDraft.x),
      y: Number(addAtomDraft.y),
      z: Number(addAtomDraft.z),
    };
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      setAtomEditError('Coordinates must be finite numbers.');
      return;
    }

    setAtomEditError(null);
    void applyMoleculeEditCommand({
      command_type: 'add_atom',
      document_id: document.id,
      element,
      position,
      coordinate_unit: document.coordinate_unit,
    });
  };
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
  useEffect(() => {
    if (!distanceMeasurement) {
      setDistanceDraft('');
      setDistanceEditError(null);
      return;
    }

    setDistanceDraft(String(distanceMeasurement.value));
    setDistanceEditError(null);
  }, [
    distanceMeasurement?.firstAtom.index,
    distanceMeasurement?.firstAtom.x,
    distanceMeasurement?.firstAtom.y,
    distanceMeasurement?.firstAtom.z,
    distanceMeasurement?.secondAtom.index,
    distanceMeasurement?.secondAtom.x,
    distanceMeasurement?.secondAtom.y,
    distanceMeasurement?.secondAtom.z,
  ]);
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
  const selectedAtomPair = document && selectedAtoms.length === 2
    ? {
        firstAtom: selectedAtoms[0],
        secondAtom: selectedAtoms[1],
      }
    : null;
  const selectedBond = selectedAtomPair && document
    ? document.bonds.find((bond) => bondMatches(
        bond,
        selectedAtomPair.firstAtom.index,
        selectedAtomPair.secondAtom.index,
      )) ?? null
    : null;

  const applyBondEdit = (
    commandType: 'add_bond' | 'remove_bond',
  ): void => {
    if (!document || !selectedAtomPair) {
      return;
    }

    void applyMoleculeEditCommand({
      command_type: commandType,
      document_id: document.id,
      atom1_index: selectedAtomPair.firstAtom.index,
      atom2_index: selectedAtomPair.secondAtom.index,
    });
  };
  const submitDistanceEdit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!document || !selectedAtomPair) {
      return;
    }

    const distance = Number(distanceDraft);
    if (!Number.isFinite(distance) || distance <= 0) {
      setDistanceEditError('Distance must be a positive number.');
      return;
    }

    setDistanceEditError(null);
    void applyMoleculeEditCommand({
      command_type: 'set_atom_distance',
      document_id: document.id,
      atom1_index: selectedAtomPair.firstAtom.index,
      atom2_index: selectedAtomPair.secondAtom.index,
      distance,
      coordinate_unit: document.coordinate_unit,
    });
  };
  const deleteSelectedAtoms = (): void => {
    if (!document || selectedAtoms.length === 0) {
      return;
    }

    setAtomEditError(null);
    void applyMoleculeEditCommand({
      command_type: 'delete_atoms',
      document_id: document.id,
      atom_indices: selectedAtoms.map((atom) => atom.index),
    });
  };
  const deleteSelectionDisabled = Boolean(
    !document ||
    selectedAtoms.length === 0 ||
    selectedAtoms.length >= document.atoms.length ||
    isApplyingMoleculeEdit,
  );

  return (
    <section
      aria-labelledby="selected-atoms-heading"
      style={{ marginTop: 16 }}
    >
      <h2 id="selected-atoms-heading">Selected Atoms</h2>
      {selectedAtoms.length === 0 ? (
        <p>Select an atom to inspect its metadata.</p>
      ) : (
        <>
          <button
            onClick={clearAtomSelection}
            style={{ marginBottom: 8 }}
            type="button"
          >
            Clear Selection
          </button>
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
          {singleSelectedAtom ? (
            <form
              aria-label="Edit selected atom coordinates"
              onSubmit={submitCoordinateEdit}
              style={{ marginTop: 12 }}
            >
              <fieldset disabled={isApplyingMoleculeEdit}>
                <legend>
                  Edit Atom {singleSelectedAtom.index}{' '}
                  {singleSelectedAtom.element} Coordinates
                </legend>
                <label style={{ display: 'inline-flex', gap: 6 }}>
                  X
                  <input
                    aria-label="X coordinate"
                    inputMode="decimal"
                    onChange={(event) => updateCoordinateDraft(
                      'x',
                      event.currentTarget.value,
                    )}
                    type="text"
                    value={coordinateDraft.x}
                  />
                </label>
                <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
                  Y
                  <input
                    aria-label="Y coordinate"
                    inputMode="decimal"
                    onChange={(event) => updateCoordinateDraft(
                      'y',
                      event.currentTarget.value,
                    )}
                    type="text"
                    value={coordinateDraft.y}
                  />
                </label>
                <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
                  Z
                  <input
                    aria-label="Z coordinate"
                    inputMode="decimal"
                    onChange={(event) => updateCoordinateDraft(
                      'z',
                      event.currentTarget.value,
                    )}
                    type="text"
                    value={coordinateDraft.z}
                  />
                </label>
                <button style={{ marginLeft: 8 }} type="submit">
                  {isApplyingMoleculeEdit
                    ? 'Applying Coordinates...'
                    : 'Apply Coordinates'}
                </button>
              </fieldset>
              {coordinateEditError ? (
                <p style={{ color: '#ff8080' }}>{coordinateEditError}</p>
              ) : null}
            </form>
          ) : null}
          {selectedAtomPair ? (
            <section
              aria-label="Edit selected atom bond"
              style={{ marginTop: 12 }}
            >
              <h3>
                Bond Between {selectedAtomPair.firstAtom.index}{' '}
                {selectedAtomPair.firstAtom.element} and{' '}
                {selectedAtomPair.secondAtom.index}{' '}
                {selectedAtomPair.secondAtom.element}
              </h3>
              <p>
                Current bond:{' '}
                {selectedBond ? 'present' : 'absent'}
              </p>
              <form
                aria-label="Edit selected atom distance"
                onSubmit={submitDistanceEdit}
                style={{ marginBottom: 8 }}
              >
                <fieldset disabled={isApplyingMoleculeEdit}>
                  <legend>
                    Set Distance Between {selectedAtomPair.firstAtom.index}{' '}
                    {selectedAtomPair.firstAtom.element} and{' '}
                    {selectedAtomPair.secondAtom.index}{' '}
                    {selectedAtomPair.secondAtom.element}
                  </legend>
                  <label style={{ display: 'inline-flex', gap: 6 }}>
                    Distance ({document?.coordinate_unit})
                    <input
                      aria-label="Selected atom distance"
                      inputMode="decimal"
                      onChange={(event) => setDistanceDraft(
                        event.currentTarget.value,
                      )}
                      type="text"
                      value={distanceDraft}
                    />
                  </label>
                  <button style={{ marginLeft: 8 }} type="submit">
                    {isApplyingMoleculeEdit
                      ? 'Setting Distance...'
                      : 'Set Distance'}
                  </button>
                </fieldset>
                {distanceEditError ? (
                  <p style={{ color: '#ff8080' }}>{distanceEditError}</p>
                ) : null}
              </form>
              <button
                disabled={isApplyingMoleculeEdit || selectedBond !== null}
                onClick={() => applyBondEdit('add_bond')}
                type="button"
              >
                {isApplyingMoleculeEdit ? 'Applying Bond...' : 'Add Bond'}
              </button>
              <button
                disabled={isApplyingMoleculeEdit || selectedBond === null}
                onClick={() => applyBondEdit('remove_bond')}
                style={{ marginLeft: 8 }}
                type="button"
              >
                {isApplyingMoleculeEdit ? 'Applying Bond...' : 'Remove Bond'}
              </button>
            </section>
          ) : null}
          {document ? (
            <section
              aria-label="Delete selected atoms"
              style={{ marginTop: 12 }}
            >
              <h3>Delete Selected Atoms</h3>
              <p>
                Selected atom indices:{' '}
                {selectedAtoms.map((atom) => atom.index).join(', ')}
              </p>
              <button
                disabled={deleteSelectionDisabled}
                onClick={deleteSelectedAtoms}
                type="button"
              >
                {isApplyingMoleculeEdit
                  ? 'Deleting Atoms...'
                  : 'Delete Selected Atoms'}
              </button>
              {selectedAtoms.length >= document.atoms.length ? (
                <p>Cannot delete every atom from a molecule document.</p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
      {document ? (
        <form
          aria-label="Add atom"
          onSubmit={submitAddAtomEdit}
          style={{ marginTop: 12 }}
        >
          <fieldset disabled={isApplyingMoleculeEdit}>
            <legend>Add Atom</legend>
            <label style={{ display: 'inline-flex', gap: 6 }}>
              Element
              <input
                aria-label="New atom element"
                onChange={(event) => updateAddAtomDraft(
                  'element',
                  event.currentTarget.value,
                )}
                type="text"
                value={addAtomDraft.element}
              />
            </label>
            <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
              X
              <input
                aria-label="New atom X coordinate"
                inputMode="decimal"
                onChange={(event) => updateAddAtomDraft(
                  'x',
                  event.currentTarget.value,
                )}
                type="text"
                value={addAtomDraft.x}
              />
            </label>
            <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
              Y
              <input
                aria-label="New atom Y coordinate"
                inputMode="decimal"
                onChange={(event) => updateAddAtomDraft(
                  'y',
                  event.currentTarget.value,
                )}
                type="text"
                value={addAtomDraft.y}
              />
            </label>
            <label style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }}>
              Z
              <input
                aria-label="New atom Z coordinate"
                inputMode="decimal"
                onChange={(event) => updateAddAtomDraft(
                  'z',
                  event.currentTarget.value,
                )}
                type="text"
                value={addAtomDraft.z}
              />
            </label>
            <button style={{ marginLeft: 8 }} type="submit">
              {isApplyingMoleculeEdit ? 'Adding Atom...' : 'Add Atom'}
            </button>
          </fieldset>
          {atomEditError ? (
            <p style={{ color: '#ff8080' }}>{atomEditError}</p>
          ) : null}
        </form>
      ) : null}
      {moleculeEditError ? (
        <p style={{ color: '#ff8080' }}>{moleculeEditError}</p>
      ) : null}
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
