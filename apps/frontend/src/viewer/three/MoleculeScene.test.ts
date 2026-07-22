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
};

const MEDIUM_FIXTURE_ATOM_COUNT = 64;
const MEDIUM_SCENE_GENERATION_BUDGET_MS = 1000;

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
      waterBondObjects.every((object) => object instanceof THREE.Line),
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

  it('toggles bond visibility without hiding atoms', () => {
    const moleculeScene = new MoleculeScene();
    moleculeScene.setMolecule(WATER);
    const scene = moleculeScene.getScene();
    const atoms = atomObjects(scene);
    const bonds = bondObjects(scene);

    expect(bonds).toHaveLength(2);
    expect(bonds.every((object) => object.visible)).toBe(true);

    moleculeScene.setBondVisibility(false);

    expect(bonds.every((object) => !object.visible)).toBe(true);
    expect(atoms.every((object) => object.visible)).toBe(true);

    moleculeScene.setBondVisibility(true);

    expect(bonds.every((object) => object.visible)).toBe(true);
    expect(atoms.every((object) => object.visible)).toBe(true);
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
    const bondMaterials = moleculeObjects(moleculeScene.getScene())
      .filter((object) => object instanceof THREE.Line)
      .map((object) => object.material as THREE.LineBasicMaterial);
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
});
