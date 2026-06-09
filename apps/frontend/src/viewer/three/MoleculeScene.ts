import * as THREE from 'three';

import type { MoleculeDocument } from '../../shared/types';
import { DEFAULT_ELEMENT_COLOR, ELEMENT_COLORS } from './elementColors';

const ATOM_RADIUS = 0.2;

export class MoleculeScene {
  private readonly scene = new THREE.Scene();

  constructor() {
    this.scene.background = new THREE.Color(0x141922);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public setMolecule(document: MoleculeDocument | null): void {
    this.clearMoleculeObjects();

    if (!document) {
      return;
    }

    const atomPositions = new Map<number, THREE.Vector3>();

    for (const atom of document.atoms) {
      const position = new THREE.Vector3(atom.x, atom.y, atom.z);
      atomPositions.set(atom.index, position);

      const geometry = new THREE.SphereGeometry(ATOM_RADIUS, 24, 24);
      const color = ELEMENT_COLORS[atom.element] ?? DEFAULT_ELEMENT_COLOR;
      const material = new THREE.MeshStandardMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(position);
      sphere.userData.moleculeObject = true;
      this.scene.add(sphere);
    }

    for (const bond of document.bonds) {
      const start = atomPositions.get(bond.atom1);
      const end = atomPositions.get(bond.atom2);
      if (!start || !end) {
        continue;
      }
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const material = new THREE.LineBasicMaterial({ color: 0xbbbbbb });
      const line = new THREE.Line(geometry, material);
      line.userData.moleculeObject = true;
      this.scene.add(line);
    }
  }

  public computeBoundingBox(): THREE.Box3 | null {
    const moleculeObjects = this.scene.children.filter((child: THREE.Object3D) => child.userData.moleculeObject);
    if (moleculeObjects.length === 0) {
      return null;
    }
    const box = new THREE.Box3();
    for (const object of moleculeObjects) {
      box.union(new THREE.Box3().setFromObject(object));
    }
    return box;
  }

  private clearMoleculeObjects(): void {
    const toRemove = this.scene.children.filter((child: THREE.Object3D) => child.userData.moleculeObject);

    for (const object of toRemove) {
      this.scene.remove(object);
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else {
          material.dispose();
        }
      }
    }
  }
}
