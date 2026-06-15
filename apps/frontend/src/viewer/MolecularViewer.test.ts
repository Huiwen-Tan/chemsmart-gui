import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useViewerStore } from '../state/useViewerStore';
import { connectAtomHighlights, connectAtomPicking } from './MolecularViewer';

function createTarget(): HTMLElement {
  const target = document.createElement('canvas');
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    top: 20,
    width: 200,
    height: 100,
  } as DOMRect);
  return target;
}

describe('connectAtomPicking', () => {
  beforeEach(() => {
    useViewerStore.setState({ selectedAtomIndices: [] });
  });

  it('toggles a picked atom from canvas click coordinates', () => {
    const target = createTarget();
    const camera = new THREE.PerspectiveCamera();
    const pickAtom = vi.fn().mockReturnValue(3);
    const disconnect = connectAtomPicking(
      target,
      { pickAtom },
      camera,
      useViewerStore.getState().toggleAtomSelection,
    );

    target.dispatchEvent(
      new MouseEvent('click', { clientX: 110, clientY: 70 }),
    );

    expect(pickAtom).toHaveBeenCalledWith(new THREE.Vector2(0, 0), camera);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3]);

    disconnect();
    target.dispatchEvent(
      new MouseEvent('click', { clientX: 110, clientY: 70 }),
    );
    expect(pickAtom).toHaveBeenCalledOnce();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3]);
  });

  it('leaves selection unchanged when the pointer misses', () => {
    const target = createTarget();
    const pickAtom = vi.fn().mockReturnValue(null);
    const toggleAtomSelection = vi.fn();
    const disconnect = connectAtomPicking(
      target,
      { pickAtom },
      new THREE.PerspectiveCamera(),
      toggleAtomSelection,
    );

    target.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 20 }));

    expect(pickAtom).toHaveBeenCalledWith(
      new THREE.Vector2(-1, 1),
      expect.any(THREE.PerspectiveCamera),
    );
    expect(toggleAtomSelection).not.toHaveBeenCalled();
    disconnect();
  });
});

describe('connectAtomHighlights', () => {
  it('synchronizes viewer selection changes until disconnected', () => {
    const setSelectedAtomIndices = vi.fn();
    useViewerStore.setState({ selectedAtomIndices: [1] });

    const disconnect = connectAtomHighlights({ setSelectedAtomIndices });

    expect(setSelectedAtomIndices).toHaveBeenLastCalledWith([1]);

    useViewerStore.getState().toggleAtomSelection(3);
    expect(setSelectedAtomIndices).toHaveBeenLastCalledWith([1, 3]);

    disconnect();
    useViewerStore.getState().toggleAtomSelection(2);
    expect(setSelectedAtomIndices).toHaveBeenCalledTimes(2);
  });
});
