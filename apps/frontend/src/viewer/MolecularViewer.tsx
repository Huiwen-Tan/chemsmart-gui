import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { MoleculeDocument } from '../shared/types';
import { useViewerStore } from '../state/useViewerStore';
import { MoleculeScene } from './three/MoleculeScene';

interface MolecularViewerProps {
  document: MoleculeDocument | null;
}

interface AtomPicker {
  pickAtom(pointer: THREE.Vector2, camera: THREE.Camera): number | null;
}

interface AtomHighlighter {
  setSelectedAtomIndices(selectedAtomIndices: readonly number[]): void;
}

const DRAG_PICKING_THRESHOLD_PX = 4;

function applyAtomHighlights(
  scene: AtomHighlighter,
  selectedAtomIndices: readonly number[],
): void {
  scene.setSelectedAtomIndices(selectedAtomIndices);
}

export function connectAtomHighlights(scene: AtomHighlighter): () => void {
  applyAtomHighlights(scene, useViewerStore.getState().selectedAtomIndices);
  return useViewerStore.subscribe((state) => {
    applyAtomHighlights(scene, state.selectedAtomIndices);
  });
}

export function connectAtomPicking(
  target: HTMLElement,
  scene: AtomPicker,
  camera: THREE.Camera,
  toggleAtomSelection: (atomIndex: number) => void,
): () => void {
  let pointerDownPosition: { x: number; y: number } | null = null;
  let draggedSincePointerDown = false;

  const onPointerDown = (event: PointerEvent): void => {
    pointerDownPosition = { x: event.clientX, y: event.clientY };
    draggedSincePointerDown = false;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!pointerDownPosition) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - pointerDownPosition.x,
      event.clientY - pointerDownPosition.y,
    );
    if (distance > DRAG_PICKING_THRESHOLD_PX) {
      draggedSincePointerDown = true;
    }
  };

  const onPointerCancel = (): void => {
    pointerDownPosition = null;
    draggedSincePointerDown = false;
  };

  const onClick = (event: MouseEvent): void => {
    if (draggedSincePointerDown) {
      pointerDownPosition = null;
      draggedSincePointerDown = false;
      return;
    }
    pointerDownPosition = null;

    const bounds = target.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const atomIndex = scene.pickAtom(pointer, camera);
    if (atomIndex !== null) {
      toggleAtomSelection(atomIndex);
    }
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointercancel', onPointerCancel);
  target.addEventListener('click', onClick);
  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointercancel', onPointerCancel);
    target.removeEventListener('click', onClick);
  };
}

export function MolecularViewer({ document }: MolecularViewerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<MoleculeScene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const sceneWrapper = new MoleculeScene();
    sceneRef.current = sceneWrapper;
    const scene = sceneWrapper.getScene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;
    rendererRef.current = renderer;
    const disconnectAtomPicking = connectAtomPicking(
      renderer.domElement,
      sceneWrapper,
      camera,
      useViewerStore.getState().toggleAtomSelection,
    );
    const disconnectAtomHighlights = connectAtomHighlights(sceneWrapper);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(2, 2, 4);
    scene.add(directional);

    let animationFrameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nextWidth = container.clientWidth || 600;
      const nextHeight = container.clientHeight || 400;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
      disconnectAtomPicking();
      disconnectAtomHighlights();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sceneWrapper = sceneRef.current;
    const container = containerRef.current;
    if (!sceneWrapper || !container) {
      return;
    }

    sceneWrapper.setMolecule(document);
    applyAtomHighlights(
      sceneWrapper,
      useViewerStore.getState().selectedAtomIndices,
    );

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }

    const box = sceneWrapper.computeBoundingBox();
    if (!box) {
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.max(2, (maxDim / (2 * Math.tan(fov / 2))) * 1.8);

    camera.position.set(center.x + distance, center.y + distance * 0.8, center.z + distance);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }, [document]);

  return <div ref={containerRef} style={{ width: '100%', height: 480, border: '1px solid #324055' }} />;
}
