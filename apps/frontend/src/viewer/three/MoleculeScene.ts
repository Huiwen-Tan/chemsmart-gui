import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import type { MoleculeDocument, VibrationalMode } from '../../shared/types';
import { DEFAULT_ELEMENT_COLOR, ELEMENT_COLORS } from './elementColors';

const HYDROGEN_ATOM_RADIUS = 0.2;
const DEFAULT_ATOM_RADIUS = 0.3;
const ELEMENT_RADII: Readonly<Record<string, number>> = {
  H: HYDROGEN_ATOM_RADIUS,
  He: 0.23,
  B: 0.3,
  C: 0.3,
  N: 0.28,
  O: 0.27,
  F: 0.26,
  Ne: 0.26,
  Si: 0.34,
  P: 0.34,
  S: 0.34,
  Cl: 0.33,
  Ar: 0.33,
  Br: 0.36,
  I: 0.39,
};
const BOND_COLOR = 0xa8b0ba;
const BOND_RADIUS = 0.055;
const MODE_DISPLACEMENT_ARROW_COLOR = 0xf97316;
const MODE_DISPLACEMENT_ARROW_SCALE = 2.5;
const MODE_DISPLACEMENT_ARROW_MIN_LENGTH = 0.25;
const MODE_DISPLACEMENT_ARROW_MAX_LENGTH = 1.2;
const MODE_DISPLACEMENT_ARROW_HEAD_LENGTH = 0.16;
const MODE_DISPLACEMENT_ARROW_HEAD_WIDTH = 0.08;
const MODE_ANIMATION_AMPLITUDE_SCALE = 1.5;
const MODE_ANIMATION_PERIOD_MS = 1600;
const SELECTED_ATOM_EMISSIVE_COLOR = 0xffb300;
const SELECTED_ATOM_EMISSIVE_INTENSITY = 0.8;
const FROZEN_ATOM_EMISSIVE_COLOR = 0x38bdf8;
const FROZEN_ATOM_EMISSIVE_INTENSITY = 0.55;
const DEFAULT_ATOM_EMISSIVE_COLOR = 0x000000;
const DEFAULT_ATOM_EMISSIVE_INTENSITY = 1;

function createAtomLabel(
  text: string,
  position: THREE.Vector3,
  atomIndex: number,
  atomRadius: number,
): CSS2DObject {
  const element = document.createElement('span');
  element.textContent = text;
  element.className = 'workbench-atom-label';
  element.style.display = 'none';

  const label = new CSS2DObject(element);
  label.position.copy(position);
  label.position.y += atomRadius * 1.8;
  label.visible = false;
  label.userData.moleculeObject = true;
  label.userData.atomLabel = true;
  label.userData.atomLabelIndex = atomIndex;
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

function positionBondCylinder(
  cylinder: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
): void {
  const direction = end.clone().sub(start);
  const length = direction.length();
  cylinder.position.copy(start).add(end).multiplyScalar(0.5);
  cylinder.scale.set(1, length, 1);
  if (length > 0) {
    cylinder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
  }
}

function disposeObjectResources(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else {
        material.dispose();
      }
    }

    if (child instanceof CSS2DObject) {
      child.element.remove();
    }
  });
}

export class MoleculeScene {
  private readonly scene = new THREE.Scene();
  private readonly raycaster = new THREE.Raycaster();
  private readonly atomBasePositions = new Map<number, THREE.Vector3>();
  private readonly modeDisplacementVectors = new Map<number, THREE.Vector3>();
  private modeAnimationPlaying = false;
  private modeAnimationStartTimeMs = 0;

  constructor() {
    this.scene.background = null;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public setMolecule(document: MoleculeDocument | null): void {
    this.clearMoleculeObjects();
    this.atomBasePositions.clear();
    this.modeDisplacementVectors.clear();
    this.modeAnimationPlaying = false;

    if (!document) {
      return;
    }

    const frozenAtomIndices = new Set(document.frozen_atom_indices);

    for (const atom of document.atoms) {
      const position = new THREE.Vector3(atom.x, atom.y, atom.z);
      this.atomBasePositions.set(atom.index, position);

      const atomRadius = ELEMENT_RADII[atom.element] ?? DEFAULT_ATOM_RADIUS;
      const geometry = new THREE.SphereGeometry(atomRadius, 24, 24);
      const color = ELEMENT_COLORS[atom.element] ?? DEFAULT_ELEMENT_COLOR;
      const material = new THREE.MeshStandardMaterial({ color });
      const isFrozen = frozenAtomIndices.has(atom.index);
      applyAtomMaterialState(material, false, isFrozen);
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(position);
      sphere.userData.moleculeObject = true;
      sphere.userData.atomIndex = atom.index;
      sphere.userData.atomRadius = atomRadius;
      sphere.userData.frozenAtom = isFrozen;
      this.scene.add(sphere);

      this.scene.add(
        createAtomLabel(
          `${atom.index} ${atom.element}`,
          position,
          atom.index,
          atomRadius,
        ),
      );
    }

    for (const bond of document.bonds) {
      const start = this.atomBasePositions.get(bond.atom1);
      const end = this.atomBasePositions.get(bond.atom2);
      if (!start || !end) {
        continue;
      }
      const geometry = new THREE.CylinderGeometry(
        BOND_RADIUS,
        BOND_RADIUS,
        1,
        12,
      );
      const material = new THREE.MeshStandardMaterial({
        color: BOND_COLOR,
        roughness: 0.55,
      });
      const cylinder = new THREE.Mesh(geometry, material);
      positionBondCylinder(cylinder, start, end);
      cylinder.userData.moleculeObject = true;
      cylinder.userData.bondObject = true;
      cylinder.userData.bondAtom1 = bond.atom1;
      cylinder.userData.bondAtom2 = bond.atom2;
      this.scene.add(cylinder);
    }
  }

  public setModeDisplacementVectors(
    mode: VibrationalMode | null,
    showDisplacementVectors = true,
  ): void {
    this.resetModeAnimationFrame();
    this.modeAnimationPlaying = false;
    this.modeDisplacementVectors.clear();
    this.clearModeDisplacementObjects();

    if (!mode) {
      return;
    }

    for (const displacement of mode.displacements) {
      const origin = this.atomBasePositions.get(displacement.atom_index);
      if (!origin) {
        continue;
      }

      const vector = new THREE.Vector3(
        displacement.x,
        displacement.y,
        displacement.z,
      );
      const vectorLength = vector.length();
      if (vectorLength === 0) {
        continue;
      }
      this.modeDisplacementVectors.set(displacement.atom_index, vector.clone());

      if (!showDisplacementVectors) {
        continue;
      }

      const arrowLength = Math.min(
        MODE_DISPLACEMENT_ARROW_MAX_LENGTH,
        Math.max(
          MODE_DISPLACEMENT_ARROW_MIN_LENGTH,
          vectorLength * MODE_DISPLACEMENT_ARROW_SCALE,
        ),
      );
      const arrow = new THREE.ArrowHelper(
        vector.clone().normalize(),
        origin,
        arrowLength,
        MODE_DISPLACEMENT_ARROW_COLOR,
        Math.min(arrowLength * 0.45, MODE_DISPLACEMENT_ARROW_HEAD_LENGTH),
        MODE_DISPLACEMENT_ARROW_HEAD_WIDTH,
      );
      arrow.userData.moleculeObject = true;
      arrow.userData.modeDisplacementObject = true;
      arrow.userData.modeDisplacementAtomIndex = displacement.atom_index;
      arrow.userData.modeIndex = mode.index;
      this.scene.add(arrow);
    }
  }

  public setModeAnimationPlaying(
    isPlaying: boolean,
    timestampMs = performance.now(),
  ): void {
    if (!isPlaying || this.modeDisplacementVectors.size === 0) {
      this.modeAnimationPlaying = false;
      this.resetModeAnimationFrame();
      return;
    }

    this.modeAnimationPlaying = true;
    this.modeAnimationStartTimeMs = timestampMs;
    this.updateModeAnimationFrame(timestampMs);
  }

  public updateModeAnimationFrame(timestampMs: number): void {
    if (!this.modeAnimationPlaying || this.modeDisplacementVectors.size === 0) {
      return;
    }

    const elapsedMs = timestampMs - this.modeAnimationStartTimeMs;
    const phase = (elapsedMs / MODE_ANIMATION_PERIOD_MS) * Math.PI * 2;
    this.applyModeAnimationOffset(Math.sin(phase));
  }

  public computeBoundingBox(): THREE.Box3 | null {
    const moleculeObjects = this.scene.children.filter((child: THREE.Object3D) => (
      child.userData.moleculeObject &&
      !child.userData.atomLabel &&
      !child.userData.modeDisplacementObject
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

  private resetModeAnimationFrame(): void {
    this.applyModeAnimationOffset(0);
  }

  private applyModeAnimationOffset(amplitude: number): void {
    for (const [atomIndex, basePosition] of this.atomBasePositions) {
      const displacement = this.modeDisplacementVectors.get(atomIndex);
      if (!displacement) {
        this.updateAtomPosition(atomIndex, basePosition);
        continue;
      }

      const animatedPosition = basePosition.clone().add(
        displacement
          .clone()
          .multiplyScalar(amplitude * MODE_ANIMATION_AMPLITUDE_SCALE),
      );
      this.updateAtomPosition(atomIndex, animatedPosition);
    }

    this.updateBondPositions();
    this.updateModeDisplacementArrowOrigins();
  }

  private updateAtomPosition(
    atomIndex: number,
    position: THREE.Vector3,
  ): void {
    for (const object of this.scene.children) {
      if (
        object instanceof THREE.Mesh &&
        object.userData.atomIndex === atomIndex
      ) {
        object.position.copy(position);
      }

      if (object.userData.atomLabelIndex === atomIndex) {
        object.position.copy(position);
        const atomObject = this.scene.children.find((candidate) => (
          candidate.userData.atomIndex === atomIndex
        ));
        const atomRadius =
          typeof atomObject?.userData.atomRadius === 'number'
            ? atomObject.userData.atomRadius
            : DEFAULT_ATOM_RADIUS;
        object.position.y += atomRadius * 1.8;
      }
    }
  }

  private updateBondPositions(): void {
    for (const object of this.scene.children) {
      if (!(object instanceof THREE.Mesh) || !object.userData.bondObject) {
        continue;
      }

      const start = this.getCurrentAtomPosition(object.userData.bondAtom1);
      const end = this.getCurrentAtomPosition(object.userData.bondAtom2);
      if (!start || !end) {
        continue;
      }

      positionBondCylinder(object, start, end);
    }
  }

  private updateModeDisplacementArrowOrigins(): void {
    for (const object of this.scene.children) {
      if (!object.userData.modeDisplacementObject) {
        continue;
      }

      const position = this.getCurrentAtomPosition(
        object.userData.modeDisplacementAtomIndex,
      );
      if (position) {
        object.position.copy(position);
      }
    }
  }

  private getCurrentAtomPosition(atomIndex: unknown): THREE.Vector3 | null {
    if (typeof atomIndex !== 'number') {
      return null;
    }

    const atom = this.scene.children.find((object) => (
      object instanceof THREE.Mesh && object.userData.atomIndex === atomIndex
    ));
    return atom ? atom.position.clone() : null;
  }

  private clearMoleculeObjects(): void {
    const toRemove = this.scene.children.filter((child: THREE.Object3D) => child.userData.moleculeObject);

    for (const object of toRemove) {
      this.scene.remove(object);
      disposeObjectResources(object);
    }
  }

  private clearModeDisplacementObjects(): void {
    const toRemove = this.scene.children.filter((child: THREE.Object3D) => (
      child.userData.modeDisplacementObject
    ));

    for (const object of toRemove) {
      this.scene.remove(object);
      disposeObjectResources(object);
    }
  }
}
