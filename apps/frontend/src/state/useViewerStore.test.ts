import { beforeEach, describe, expect, it } from 'vitest';

import { useViewerStore } from './useViewerStore';

describe('useViewerStore', () => {
  beforeEach(() => {
    useViewerStore.setState({ selectedAtomIndices: [], showBonds: true });
  });

  it('toggles multiple 1-based atom indices', () => {
    const { toggleAtomSelection } = useViewerStore.getState();

    toggleAtomSelection(1);
    toggleAtomSelection(3);

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 3]);

    toggleAtomSelection(1);

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3]);
  });

  it('clears the atom selection', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    useViewerStore.getState().clearAtomSelection();

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });

  it('sets bond visibility without changing selection', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    useViewerStore.getState().setShowBonds(false);

    expect(useViewerStore.getState().showBonds).toBe(false);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 2]);

    useViewerStore.getState().setShowBonds(true);

    expect(useViewerStore.getState().showBonds).toBe(true);
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 2]);
  });

  it.each([0, -1, 1.5])('rejects invalid atom index %s', (atomIndex) => {
    expect(() => {
      useViewerStore.getState().toggleAtomSelection(atomIndex);
    }).toThrow('Atom index must be a positive integer.');

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
  });
});
