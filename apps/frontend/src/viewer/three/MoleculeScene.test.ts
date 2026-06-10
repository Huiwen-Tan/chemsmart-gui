import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../../shared/types';
import { MoleculeScene } from './MoleculeScene';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'Water',
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
  id: 'helium',
  name: 'Helium',
  atoms: [{ index: 1, element: 'He', x: 0, y: 0, z: 0 }],
  bonds: [],
};

function moleculeObjects(scene: THREE.Scene): THREE.Object3D[] {
  return scene.children.filter((child) => child.userData.moleculeObject);
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
});
