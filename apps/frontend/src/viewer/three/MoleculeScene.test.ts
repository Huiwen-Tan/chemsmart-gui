import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../../shared/types';
import { MoleculeScene } from './MoleculeScene';

const WATER: MoleculeDocument = {
  id: '102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082',
  name: 'str-H2O-102b86d02472',
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
};

const HELIUM: MoleculeDocument = {
  id: '4054373538ed8c659cd165de0c57822be13073206e4305ddc5dc6937fb2cd65b',
  name: 'str-He-4054373538ed',
  coordinate_unit: 'angstrom',
  charge: 0,
  multiplicity: 1,
  atoms: [{ index: 1, element: 'He', x: 0, y: 0, z: 0 }],
  bonds: [],
};

function moleculeObjects(scene: THREE.Scene): THREE.Object3D[] {
  return scene.children.filter((child) => child.userData.moleculeObject);
}

function atomObjects(scene: THREE.Scene): THREE.Object3D[] {
  return moleculeObjects(scene).filter(
    (object) => typeof object.userData.atomIndex === 'number',
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

describe('MoleculeScene', () => {
  it('replaces and clears molecule objects while disposing their resources', () => {
    const moleculeScene = new MoleculeScene();
    const scene = moleculeScene.getScene();
    const light = new THREE.AmbientLight();
    scene.add(light);

    moleculeScene.setMolecule(WATER);

    const waterObjects = moleculeObjects(scene);
    const waterDisposal = waterObjects.map(spyOnDisposal);
    expect(waterObjects).toHaveLength(5);
    expect(
      atomObjects(scene).map((object) => object.userData.atomIndex),
    ).toEqual([1, 2, 3]);
    const bondObjects = waterObjects.filter(
      (object) => object instanceof THREE.Line,
    );
    expect(bondObjects).toHaveLength(2);
    expect(
      bondObjects.every((object) => object.userData.atomIndex === undefined),
    ).toBe(true);
    expect(moleculeScene.computeBoundingBox()).not.toBeNull();

    moleculeScene.setMolecule(HELIUM);

    expect(moleculeObjects(scene)).toHaveLength(1);
    expect(scene.children).toContain(light);
    for (const disposal of waterDisposal) {
      expect(disposal.geometry).toHaveBeenCalledOnce();
      for (const material of disposal.materials) {
        expect(material).toHaveBeenCalledOnce();
      }
    }

    const heliumDisposal = moleculeObjects(scene).map(spyOnDisposal);
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
