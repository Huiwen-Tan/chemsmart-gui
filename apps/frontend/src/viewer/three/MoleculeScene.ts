import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import type { MoleculeDocument } from '../../shared/types';
import { DEFAULT_ELEMENT_COLOR, ELEMENT_COLORS } from './elementColors';

const ATOM_RADIUS = 0.2;
const LABEL_OFFSET = ATOM_RADIUS * 1.8;
const SELECTED_ATOM_EMISSIVE_COLOR = 0xffb300;
const SELECTED_ATOM_EMISSIVE_INTENSITY = 0.8;
const FROZEN_ATOM_EMISSIVE_COLOR = 0x38bdf8;
const FROZEN_ATOM_EMISSIVE_INTENSITY = 0.55;
const DEFAULT_ATOM_EMISSIVE_COLOR = 0x000000;
const DEFAULT_ATOM_EMISSIVE_INTENSITY = 1;

function createAtomLabel(text: string, position: THREE.Vector3): CSS2DObject {
  const element = document.createElement('span');
  element.textContent = text;
  element.style.background = 'rgba(20, 25, 34, 0.75)';
  element.style.border = '1px solid rgba(255, 255, 255, 0.3)';
  element.style.borderRadius = '4px';
  element.style.color = '#f8fafc';
  element.style.fontSize = '12px';
  element.style.padding = '1px 4px';
  element.style.pointerEvents = 'none';
  element.style.whiteSpace = 'nowrap';
  element.style.display = 'none';

  const label = new CSS2DObject(element);
  label.position.copy(position);
  label.position.y += LABEL_OFFSET;
  label.visible = false;
  label.userData.moleculeObject = true;
  label.userData.atomLabel = true;
  return label;
}

function applyAtomMaterialState(
  material: THREE.MeshStandardMaterial,
  isSelected: boolean,
  isFrozen: boolean,
): void {
  if (isSelected) {
    material.emissive.setHex(SELECTED_ATOM_EMISSIVE_COLOR);
    material.emissiveIntensity = SELECTED_ATOM_EMISSIVE_INTENSITY;
    return;
  }

  if (isFrozen) {
    material.emissive.setHex(FROZEN_ATOM_EMISSIVE_COLOR);
    material.emissiveIntensity = FROZEN_ATOM_EMISSIVE_INTENSITY;
    return;
  }

  material.emissive.setHex(DEFAULT_ATOM_EMISSIVE_COLOR);
  material.emissiveIntensity = DEFAULT_ATOM_EMISSIVE_INTENSITY;
}

export class MoleculeScene {
  private readonly scene = new THREE.Scene();
  private readonly raycaster = new THREE.Raycaster();

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
    const frozenAtomIndices = new Set(document.frozen_atom_indices);

    for (const atom of document.atoms) {
      const position = new THREE.Vector3(atom.x, atom.y, atom.z);
      atomPositions.set(atom.index, position);

      const geometry = new THREE.SphereGeometry(ATOM_RADIUS, 24, 24);
      const color = ELEMENT_COLORS[atom.element] ?? DEFAULT_ELEMENT_COLOR;
      const material = new THREE.MeshStandardMaterial({ color });
      const isFrozen = frozenAtomIndices.has(atom.index);
      applyAtomMaterialState(material, false, isFrozen);
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(position);
      sphere.userData.moleculeObject = true;
      sphere.userData.atomIndex = atom.index;
      sphere.userData.frozenAtom = isFrozen;
      this.scene.add(sphere);

      this.scene.add(createAtomLabel(`${atom.index} ${atom.element}`, position));
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
      line.userData.bondObject = true;
      this.scene.add(line);
    }
  }

  public computeBoundingBox(): THREE.Box3 | null {
    const moleculeObjects = this.scene.children.filter((child: THREE.Object3D) => (
      child.userData.moleculeObject && !child.userData.atomLabel
    ));
    if (moleculeObjects.length === 0) {
      return null;
    }
    const box = new THREE.Box3();
    for (const object of moleculeObjects) {
      box.union(new THREE.Box3().setFromObject(object));
    }
    return box;
  }

  public pickAtom(pointer: THREE.Vector2, camera: THREE.Camera): number | null {
    const atomObjects = this.scene.children.filter(
      (object) => typeof object.userData.atomIndex === 'number',
    );

    this.scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(pointer, camera);

    const [intersection] = this.raycaster.intersectObjects(atomObjects, false);
    const atomIndex = intersection?.object.userData.atomIndex;
    return typeof atomIndex === 'number' ? atomIndex : null;
  }

  public setSelectedAtomIndices(selectedAtomIndices: readonly number[]): void {
    const selected = new Set(selectedAtomIndices);

    for (const object of this.scene.children) {
      if (
        !(object instanceof THREE.Mesh) ||
        typeof object.userData.atomIndex !== 'number' ||
        !(object.material instanceof THREE.MeshStandardMaterial)
      ) {
        continue;
      }

      const isSelected = selected.has(object.userData.atomIndex);
      applyAtomMaterialState(
        object.material,
        isSelected,
        object.userData.frozenAtom === true,
      );
    }
  }

  public setBondVisibility(showBonds: boolean): void {
    for (const object of this.scene.children) {
      if (object.userData.bondObject) {
        object.visible = showBonds;
      }
    }
  }

  public setAtomLabelVisibility(showAtomLabels: boolean): void {
    for (const object of this.scene.children) {
      if (object.userData.atomLabel) {
        object.visible = showAtomLabels;
        if (object instanceof CSS2DObject) {
          object.element.style.display = showAtomLabels ? '' : 'none';
        }
      }
    }
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
      } else if (object instanceof CSS2DObject) {
        object.element.remove();
      }
    }
  }
}
