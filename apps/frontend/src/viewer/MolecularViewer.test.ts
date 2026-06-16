import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useViewerStore } from '../state/useViewerStore';
import {
  connectAtomHighlights,
  connectAtomLabelVisibility,
  connectAtomPicking,
  connectBondVisibility,
  connectViewReset,
} from './MolecularViewer';

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

function createPointerEvent(
  type: string,
  coordinates: { clientX: number; clientY: number },
): Event {
  const event = new Event(type);
  Object.defineProperties(event, {
    clientX: { value: coordinates.clientX },
    clientY: { value: coordinates.clientY },
  });
  return event;
}

describe('connectAtomPicking', () => {
  beforeEach(() => {
    useViewerStore.setState({
      selectedAtomIndices: [],
      showBonds: true,
      showAtomLabels: false,
      viewResetRequestId: 0,
    });
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
      useViewerStore.getState().clearAtomSelection,
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

  it('clears selection when the pointer misses', () => {
    const target = createTarget();
    const pickAtom = vi.fn().mockReturnValue(null);
    const toggleAtomSelection = vi.fn();
    const clearAtomSelection = vi.fn();
    const disconnect = connectAtomPicking(
      target,
      { pickAtom },
      new THREE.PerspectiveCamera(),
      toggleAtomSelection,
      clearAtomSelection,
    );

    target.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 20 }));

    expect(pickAtom).toHaveBeenCalledWith(
      new THREE.Vector2(-1, 1),
      expect.any(THREE.PerspectiveCamera),
    );
    expect(toggleAtomSelection).not.toHaveBeenCalled();
    expect(clearAtomSelection).toHaveBeenCalledOnce();
    disconnect();
  });

  it('ignores atom picking after a drag gesture', () => {
    const target = createTarget();
    const pickAtom = vi.fn().mockReturnValue(3);
    const toggleAtomSelection = vi.fn();
    const clearAtomSelection = vi.fn();
    const disconnect = connectAtomPicking(
      target,
      { pickAtom },
      new THREE.PerspectiveCamera(),
      toggleAtomSelection,
      clearAtomSelection,
    );

    target.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 110, clientY: 70 }),
    );
    target.dispatchEvent(
      createPointerEvent('pointermove', { clientX: 118, clientY: 70 }),
    );
    target.dispatchEvent(
      new MouseEvent('click', { clientX: 118, clientY: 70 }),
    );

    expect(pickAtom).not.toHaveBeenCalled();
    expect(toggleAtomSelection).not.toHaveBeenCalled();
    expect(clearAtomSelection).not.toHaveBeenCalled();

    disconnect();
  });

  it('removes pointer gesture listeners when disconnected', () => {
    const target = createTarget();
    const pickAtom = vi.fn().mockReturnValue(3);
    const toggleAtomSelection = vi.fn();
    const clearAtomSelection = vi.fn();
    const disconnect = connectAtomPicking(
      target,
      { pickAtom },
      new THREE.PerspectiveCamera(),
      toggleAtomSelection,
      clearAtomSelection,
    );

    disconnect();
    target.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 110, clientY: 70 }),
    );
    target.dispatchEvent(
      createPointerEvent('pointermove', { clientX: 118, clientY: 70 }),
    );
    target.dispatchEvent(
      new MouseEvent('click', { clientX: 118, clientY: 70 }),
    );

    expect(pickAtom).not.toHaveBeenCalled();
    expect(toggleAtomSelection).not.toHaveBeenCalled();
    expect(clearAtomSelection).not.toHaveBeenCalled();
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

describe('connectBondVisibility', () => {
  beforeEach(() => {
    useViewerStore.setState({
      selectedAtomIndices: [],
      showBonds: true,
      showAtomLabels: false,
      viewResetRequestId: 0,
    });
  });

  it('synchronizes bond visibility changes until disconnected', () => {
    const setBondVisibility = vi.fn();
    useViewerStore.setState({ showBonds: false });

    const disconnect = connectBondVisibility({ setBondVisibility });

    expect(setBondVisibility).toHaveBeenLastCalledWith(false);

    useViewerStore.getState().setShowBonds(true);
    expect(setBondVisibility).toHaveBeenLastCalledWith(true);

    disconnect();
    useViewerStore.getState().setShowBonds(false);
    expect(setBondVisibility).toHaveBeenCalledTimes(2);
  });
});

describe('connectAtomLabelVisibility', () => {
  beforeEach(() => {
    useViewerStore.setState({
      selectedAtomIndices: [],
      showBonds: true,
      showAtomLabels: false,
      viewResetRequestId: 0,
    });
  });

  it('synchronizes atom label visibility changes until disconnected', () => {
    const setAtomLabelVisibility = vi.fn();
    const renderLabels = vi.fn();
    useViewerStore.setState({ showAtomLabels: true });

    const disconnect = connectAtomLabelVisibility(
      { setAtomLabelVisibility },
      renderLabels,
    );

    expect(setAtomLabelVisibility).toHaveBeenLastCalledWith(true);
    expect(renderLabels).toHaveBeenCalledOnce();

    useViewerStore.getState().setShowAtomLabels(false);
    expect(setAtomLabelVisibility).toHaveBeenLastCalledWith(false);
    expect(renderLabels).toHaveBeenCalledTimes(2);

    disconnect();
    useViewerStore.getState().setShowAtomLabels(true);
    expect(setAtomLabelVisibility).toHaveBeenCalledTimes(2);
    expect(renderLabels).toHaveBeenCalledTimes(2);
  });
});

describe('connectViewReset', () => {
  beforeEach(() => {
    useViewerStore.setState({
      selectedAtomIndices: [],
      showBonds: true,
      showAtomLabels: false,
      viewResetRequestId: 0,
    });
  });

  it('runs reset callbacks only for reset requests until disconnected', () => {
    const onResetView = vi.fn();

    const disconnect = connectViewReset(onResetView);

    expect(onResetView).not.toHaveBeenCalled();

    useViewerStore.getState().requestViewReset();
    expect(onResetView).toHaveBeenCalledOnce();

    useViewerStore.getState().setShowBonds(false);
    expect(onResetView).toHaveBeenCalledOnce();

    disconnect();
    useViewerStore.getState().requestViewReset();
    expect(onResetView).toHaveBeenCalledOnce();
  });
});
