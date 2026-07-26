import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../../shared/types';
import { MoleculeScene } from './MoleculeScene';

const WATER: MoleculeDocument = {
  id: '102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082',
  name: 'str-H2O-102b86d02472',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.8, y: 0.6, z: 0 },
    { index: 3, element: 'H', x: -0.8, y: 0.6, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const WATER_WITH_VIBRATIONAL_MODES: MoleculeDocument = {
  ...WATER,
  id: 'water-with-vibrational-modes',
  vibrational_modes: [
    {
      index: 7,
      frequency_cm_minus_1: -530.2,
      is_imaginary: true,
      reduced_mass_amu: 1.2,
      force_constant_mdyne_per_angstrom: 0.3,
      ir_intensity_km_per_mol: 12.3,
      symmetry: 'A1',
      displacements: [
        { atom_index: 1, x: 0, y: 0, z: -0.1 },
        { atom_index: 2, x: 0.2, y: 0, z: 0.1 },
      ],
    },
    {
      index: 8,
      frequency_cm_minus_1: 1628.3334,
      is_imaginary: false,
      reduced_mass_amu: null,
      force_constant_mdyne_per_angstrom: null,
      ir_intensity_km_per_mol: null,
      symmetry: null,
      displacements: [],
    },
  ],
};

const HELIUM: MoleculeDocument = {
  id: '4054373538ed8c659cd165de0c57822be13073206e4305ddc5dc6937fb2cd65b',
  name: 'str-He-4054373538ed',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: 0,
  multiplicity: 1,
  atoms: [{ index: 1, element: 'He', x: 0, y: 0, z: 0 }],
  bonds: [],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const MEDIUM_FIXTURE_ATOM_COUNT = 64;
const MEDIUM_SCENE_GENERATION_BUDGET_MS = 1000;
const FROZEN_ATOM_EMISSIVE_COLOR = 0x38bdf8;
const FROZEN_ATOM_EMISSIVE_INTENSITY = 0.55;

function createMediumFixture(): MoleculeDocument {
  return {
    id: 'medium-viewer-fixture',
    name: 'medium-viewer-fixture',
    document_kind: 'structure',
    source: null,
    calculation: null,
    coordinate_unit: 'angstrom',
    charge: 0,
    multiplicity: 1,
    atoms: Array.from({ length: MEDIUM_FIXTURE_ATOM_COUNT }, (_, index) => ({
      index: index + 1,
      element: 'C',
      x: index % 4,
      y: Math.floor(index / 4) % 4,
      z: Math.floor(index / 16),
    })),
    bonds: Array.from(
      { length: MEDIUM_FIXTURE_ATOM_COUNT - 1 },
      (_, index) => ({
        atom1: index + 1,
        atom2: index + 2,
      }),
    ),
    frozen_atom_indices: [],
    vibrational_modes: [],
  };
}

function moleculeObjects(scene: THREE.Scene): THREE.Object3D[] {
  return scene.children.filter((child) => child.userData.moleculeObject);
}

function atomObjects(scene: THREE.Scene): THREE.Object3D[] {
  return moleculeObjects(scene).filter(
    (object) => typeof object.userData.atomIndex === 'number',
  );
}

function atomPosition(scene: THREE.Scene, atomIndex: number): number[] {
  const atom = atomObjects(scene).find((object) => (
    object.userData.atomIndex === atomIndex
  ));
  if (!atom) {
    throw new Error(`Expected atom ${atomIndex} in scene`);
  }
  return atom.position.toArray();
}

function atomLabelObjects(scene: THREE.Scene): THREE.Object3D[] {
  return moleculeObjects(scene).filter((object) => object.userData.atomLabel);
}

function atomLabelElements(scene: THREE.Scene): HTMLElement[] {
  return atomLabelObjects(scene).map((label) => {
    const element = (label as { element?: HTMLElement }).element;
    if (!element) {
      throw new Error('Expected an atom label with a DOM element');
    }
    return element;
  });
}

function bondObjects(scene: THREE.Scene): THREE.Object3D[] {
  return moleculeObjects(scene).filter((object) => object.userData.bondObject);
}

function modeDisplacementObjects(scene: THREE.Scene): THREE.Object3D[] {
  return moleculeObjects(scene).filter(
    (object) => object.userData.modeDisplacementObject,
  );
}

function atomMaterials(scene: THREE.Scene): THREE.MeshStandardMaterial[] {
  return atomObjects(scene).map((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    ) {
      throw new Error('Expected an atom mesh with a standard material');
    }
    return object.material;
  });
}

function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return camera;
}

function spyOnDisposal(object: THREE.Object3D) {
  if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) {
    throw new Error('Expected a disposable molecule object');
  }

  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  return {
    geometry: vi.spyOn(object.geometry, 'dispose'),
    materials: materials.map((material) => vi.spyOn(material, 'dispose')),
  };
}

function bondEndpointPosition(
  bond: THREE.Mesh,
  endpoint: 'start' | 'end',
): number[] {
  bond.updateMatrixWorld(true);
  const localY = endpoint === 'start' ? -0.5 : 0.5;
  return new THREE.Vector3(0, localY, 0)
    .applyMatrix4(bond.matrixWorld)
    .toArray();
}

function expectPositionCloseTo(
  actual: number[],
  expected: readonly number[],
): void {
  expect(actual).toHaveLength(expected.length);
  for (const [index, expectedValue] of expected.entries()) {
    expect(actual[index]).toBeCloseTo(expectedValue, 6);
  }
}

describe('MoleculeScene', () => {
  it('replaces and clears molecule objects while disposing their resources', () => {
    const moleculeScene = new MoleculeScene();
    const scene = moleculeScene.getScene();
    const light = new THREE.AmbientLight();
    scene.add(light);

    moleculeScene.setMolecule(WATER);

    const waterObjects = moleculeObjects(scene);
    const disposableWaterObjects = waterObjects.filter(
      (object) => object instanceof THREE.Mesh || object instanceof THREE.Line,
    );
    const waterDisposal = disposableWaterObjects.map(spyOnDisposal);
    expect(waterObjects).toHaveLength(8);
    expect(disposableWaterObjects).toHaveLength(5);
    expect(
      atomObjects(scene).map((object) => object.userData.atomIndex),
    ).toEqual([1, 2, 3]);
    expect(atomLabelObjects(scene)).toHaveLength(3);
    const waterBondObjects = bondObjects(scene);
    expect(waterBondObjects).toHaveLength(2);
    expect(
      waterBondObjects.every((object) => object instanceof THREE.Mesh),
    ).toBe(true);
    expect(
      waterBondObjects.every((object) => object.userData.atomIndex === undefined),
    ).toBe(true);
    expect(moleculeScene.computeBoundingBox()).not.toBeNull();

    moleculeScene.setMolecule(HELIUM);

    expect(moleculeObjects(scene)).toHaveLength(2);
    expect(scene.children).toContain(light);
    for (const disposal of waterDisposal) {
      expect(disposal.geometry).toHaveBeenCalledOnce();
      for (const material of disposal.materials) {
        expect(material).toHaveBeenCalledOnce();
      }
    }

    const heliumDisposal = moleculeObjects(scene)
      .filter((object) => (
        object instanceof THREE.Mesh || object instanceof THREE.Line
      ))
      .map(spyOnDisposal);
    moleculeScene.setMolecule(null);

    expect(moleculeObjects(scene)).toHaveLength(0);
    expect(scene.children).toEqual([light]);
    expect(moleculeScene.computeBoundingBox()).toBeNull();
    for (const disposal of heliumDisposal) {
      expect(disposal.geometry).toHaveBeenCalledOnce();
      for (const material of disposal.materials) {
        expect(material).toHaveBeenCalledOnce();
      }
    }
  });

  it('toggles atom label visibility without affecting atom picking objects', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER);
    const scene = moleculeScene.getScene();
    const labels = atomLabelObjects(scene);
    const labelElements = atomLabelElements(scene);

    expect(labels).toHaveLength(3);
    expect(labels.map((label) => label.userData.atomIndex)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(labels.every((label) => !label.visible)).toBe(true);
    expect(labelElements.map((element) => element.style.display)).toEqual([
      'none',
      'none',
      'none',
    ]);
    expect(labelElements.map((element) => element.textContent)).toEqual([
      '1 O',
      '2 H',
      '3 H',
    ]);

    moleculeScene.setAtomLabelVisibility(true);

    expect(labels.every((label) => label.visible)).toBe(true);
    expect(labelElements.map((element) => element.style.display)).toEqual([
      '',
      '',
      '',
    ]);
    expect(atomObjects(scene)).toHaveLength(3);

    moleculeScene.setAtomLabelVisibility(false);

    expect(labels.every((label) => !label.visible)).toBe(true);
    expect(labelElements.map((element) => element.style.display)).toEqual([
      'none',
      'none',
      'none',
    ]);
    expect(atomObjects(scene)).toHaveLength(3);
  });

  it('loads a medium fixture within the scene-generation baseline', () => {
    const moleculeScene = new MoleculeScene();
    const mediumFixture = createMediumFixture();

    const startTime = performance.now();
    moleculeScene.setMolecule(mediumFixture);
    const durationMs = performance.now() - startTime;
    const scene = moleculeScene.getScene();

    expect(atomObjects(scene)).toHaveLength(MEDIUM_FIXTURE_ATOM_COUNT);
    expect(bondObjects(scene)).toHaveLength(MEDIUM_FIXTURE_ATOM_COUNT - 1);
    expect(atomLabelObjects(scene)).toHaveLength(MEDIUM_FIXTURE_ATOM_COUNT);
    expect(moleculeObjects(scene)).toHaveLength(
      MEDIUM_FIXTURE_ATOM_COUNT * 3 - 1,
    );
    expect(moleculeScene.computeBoundingBox()).not.toBeNull();
    expect(durationMs).toBeLessThan(MEDIUM_SCENE_GENERATION_BUDGET_MS);
  });

  it('keeps hydrogen compact while enlarging heavier atoms', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER);
    const radii = atomObjects(moleculeScene.getScene()).map((object) => {
      if (!(object instanceof THREE.Mesh)) {
        throw new Error('Expected atom mesh');
      }
      return (object.geometry as THREE.SphereGeometry).parameters.radius;
    });

    expect(radii).toEqual([0.27, 0.2, 0.2]);
  });

  it('shows selected mode displacement arrows from vibration vectors', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER_WITH_VIBRATIONAL_MODES);
    const scene = moleculeScene.getScene();
    const boxBefore = moleculeScene.computeBoundingBox();
    if (!boxBefore) {
      throw new Error('Expected a molecule bounding box');
    }

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
    );

    const arrows = modeDisplacementObjects(scene);
    expect(arrows).toHaveLength(2);
    expect(
      arrows.every((object) => object instanceof THREE.ArrowHelper),
    ).toBe(true);
    expect(
      arrows.map((object) => object.userData.modeDisplacementAtomIndex),
    ).toEqual([1, 2]);
    expect(arrows.map((object) => object.userData.modeIndex)).toEqual([7, 7]);
    expect(arrows.map((object) => object.position.toArray())).toEqual([
      [0, 0, 0],
      [0.8, 0.6, 0],
    ]);
    expect(moleculeScene.computeBoundingBox()?.equals(boxBefore)).toBe(true);
  });

  it('keeps displacement arrows hidden while retaining mode animation data', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER_WITH_VIBRATIONAL_MODES);
    const scene = moleculeScene.getScene();

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
      false,
    );

    expect(modeDisplacementObjects(scene)).toHaveLength(0);
    moleculeScene.setModeAnimationPlaying(true, 0);
    moleculeScene.updateModeAnimationFrame(400);
    expectPositionCloseTo(atomPosition(scene, 2), [1.1, 0.6, 0.15]);
  });

  it('replaces and clears selected mode displacement arrows', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER_WITH_VIBRATIONAL_MODES);
    const scene = moleculeScene.getScene();

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
    );
    const disposableArrowChildren = modeDisplacementObjects(scene).flatMap(
      (object) => object.children.filter((child) => (
        child instanceof THREE.Mesh || child instanceof THREE.Line
      )),
    );
    const arrowDisposal = disposableArrowChildren.map(spyOnDisposal);

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[1],
    );

    expect(modeDisplacementObjects(scene)).toHaveLength(0);
    for (const disposal of arrowDisposal) {
      expect(disposal.geometry).toHaveBeenCalled();
      for (const material of disposal.materials) {
        expect(material).toHaveBeenCalled();
      }
    }

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
    );
    expect(modeDisplacementObjects(scene)).toHaveLength(2);

    moleculeScene.setMolecule(null);

    expect(modeDisplacementObjects(scene)).toHaveLength(0);
  });

  it('animates selected mode atom positions and dependent geometry', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER_WITH_VIBRATIONAL_MODES);
    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
    );
    const scene = moleculeScene.getScene();

    moleculeScene.setModeAnimationPlaying(true, 0);
    moleculeScene.updateModeAnimationFrame(400);

    expectPositionCloseTo(atomPosition(scene, 1), [0, 0, -0.15]);
    expectPositionCloseTo(atomPosition(scene, 2), [1.1, 0.6, 0.15]);
    expectPositionCloseTo(atomPosition(scene, 3), [-0.8, 0.6, 0]);
    expectPositionCloseTo(atomLabelObjects(scene)[0].position.toArray(), [
      0,
      0.486,
      -0.15,
    ]);
    const firstBond = bondObjects(scene)[0];
    if (!(firstBond instanceof THREE.Mesh)) {
      throw new Error('Expected first bond to be a Three.js mesh');
    }
    expectPositionCloseTo(bondEndpointPosition(firstBond, 'start'), [
      0,
      0,
      -0.15,
    ]);
    expectPositionCloseTo(bondEndpointPosition(firstBond, 'end'), [
      1.1,
      0.6,
      0.15,
    ]);
    expectPositionCloseTo(
      modeDisplacementObjects(scene)[1].position.toArray(),
      [1.1, 0.6, 0.15],
    );

    moleculeScene.setModeAnimationPlaying(false, 400);

    expectPositionCloseTo(atomPosition(scene, 1), [0, 0, 0]);
    expectPositionCloseTo(atomPosition(scene, 2), [0.8, 0.6, 0]);
    expectPositionCloseTo(bondEndpointPosition(firstBond, 'start'), [0, 0, 0]);
    expectPositionCloseTo(bondEndpointPosition(firstBond, 'end'), [
      0.8,
      0.6,
      0,
    ]);
    expectPositionCloseTo(
      modeDisplacementObjects(scene)[1].position.toArray(),
      [0.8, 0.6, 0],
    );
  });

  it('resets animation when selected mode has no displacement vectors', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER_WITH_VIBRATIONAL_MODES);
    const scene = moleculeScene.getScene();

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[0],
    );
    moleculeScene.setModeAnimationPlaying(true, 0);
    moleculeScene.updateModeAnimationFrame(400);
    expectPositionCloseTo(atomPosition(scene, 2), [1.1, 0.6, 0.15]);

    moleculeScene.setModeDisplacementVectors(
      WATER_WITH_VIBRATIONAL_MODES.vibrational_modes[1],
    );
    moleculeScene.setModeAnimationPlaying(true, 400);
    moleculeScene.updateModeAnimationFrame(800);

    expect(modeDisplacementObjects(scene)).toHaveLength(0);
    expectPositionCloseTo(atomPosition(scene, 1), [0, 0, 0]);
    expectPositionCloseTo(atomPosition(scene, 2), [0.8, 0.6, 0]);
    expectPositionCloseTo(atomPosition(scene, 3), [-0.8, 0.6, 0]);
  });

  it('picks atom identity from normalized pointer input', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER);

    expect(moleculeScene.pickAtom(new THREE.Vector2(0, 0), createCamera())).toBe(
      1,
    );
    expect(
      moleculeScene.pickAtom(new THREE.Vector2(0.95, 0.95), createCamera()),
    ).toBeNull();
  });

  it('does not pick non-atom scene objects', () => {
    const moleculeScene = new MoleculeScene();
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
    line.userData.moleculeObject = true;
    moleculeScene.getScene().add(line);

    expect(moleculeScene.pickAtom(new THREE.Vector2(0, 0), createCamera())).toBe(
      null,
    );
  });

  it('highlights selected atoms while preserving elemental colors', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER);
    const bondMaterials = bondObjects(moleculeScene.getScene())
      .filter((object): object is THREE.Mesh => object instanceof THREE.Mesh)
      .map((object) => object.material as THREE.MeshStandardMaterial);
    const materials = atomMaterials(moleculeScene.getScene());
    const baseColors = materials.map((material) => material.color.getHex());
    const bondColors = bondMaterials.map((material) => material.color.getHex());

    moleculeScene.setSelectedAtomIndices([1, 3]);

    expect(materials.map((material) => material.emissive.getHex())).toEqual([
      0xffb300,
      0x000000,
      0xffb300,
    ]);
    expect(materials.map((material) => material.color.getHex())).toEqual(
      baseColors,
    );
    expect(bondMaterials.map((material) => material.color.getHex())).toEqual(
      bondColors,
    );

    moleculeScene.setSelectedAtomIndices([2]);

    expect(materials.map((material) => material.emissive.getHex())).toEqual([
      0x000000,
      0xffb300,
      0x000000,
    ]);
  });

  it('highlights frozen atoms while preserving elemental colors', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule({
      ...WATER,
      frozen_atom_indices: [1, 3],
    });

    const atoms = atomObjects(moleculeScene.getScene());
    const materials = atomMaterials(moleculeScene.getScene());
    const baseColors = materials.map((material) => material.color.getHex());

    expect(atoms.map((atom) => atom.userData.frozenAtom)).toEqual([
      true,
      false,
      true,
    ]);
    expect(materials.map((material) => material.emissive.getHex())).toEqual([
      FROZEN_ATOM_EMISSIVE_COLOR,
      0x000000,
      FROZEN_ATOM_EMISSIVE_COLOR,
    ]);
    expect(
      materials.map((material) => material.emissiveIntensity),
    ).toEqual([
      FROZEN_ATOM_EMISSIVE_INTENSITY,
      1,
      FROZEN_ATOM_EMISSIVE_INTENSITY,
    ]);
    expect(materials.map((material) => material.color.getHex())).toEqual(
      baseColors,
    );
  });

  it('prioritizes selected highlights over frozen highlights', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule({
      ...WATER,
      frozen_atom_indices: [1, 3],
    });
    const materials = atomMaterials(moleculeScene.getScene());

    moleculeScene.setSelectedAtomIndices([1]);

    expect(materials.map((material) => material.emissive.getHex())).toEqual([
      0xffb300,
      0x000000,
      FROZEN_ATOM_EMISSIVE_COLOR,
    ]);
    expect(
      materials.map((material) => material.emissiveIntensity),
    ).toEqual([0.8, 1, FROZEN_ATOM_EMISSIVE_INTENSITY]);

    moleculeScene.setSelectedAtomIndices([]);

    expect(materials.map((material) => material.emissive.getHex())).toEqual([
      FROZEN_ATOM_EMISSIVE_COLOR,
      0x000000,
      FROZEN_ATOM_EMISSIVE_COLOR,
    ]);
  });
});
