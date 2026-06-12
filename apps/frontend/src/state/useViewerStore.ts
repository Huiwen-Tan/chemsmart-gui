import { create } from 'zustand';

interface ViewerState {
  selectedAtomIndices: number[];
  toggleAtomSelection: (atomIndex: number) => void;
  clearAtomSelection: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedAtomIndices: [],
  toggleAtomSelection: (atomIndex) => {
    if (!Number.isInteger(atomIndex) || atomIndex < 1) {
      throw new RangeError('Atom index must be a positive integer.');
    }

    set((state) => ({
      selectedAtomIndices: state.selectedAtomIndices.includes(atomIndex)
        ? state.selectedAtomIndices.filter((index) => index !== atomIndex)
        : [...state.selectedAtomIndices, atomIndex],
    }));
  },
  clearAtomSelection: () => set({ selectedAtomIndices: [] }),
}));
