import { create } from 'zustand';

interface ViewerState {
  selectedAtomIndices: number[];
  showAtomLabels: boolean;
  viewResetRequestId: number;
  toggleAtomSelection: (atomIndex: number) => void;
  clearAtomSelection: () => void;
  setShowAtomLabels: (showAtomLabels: boolean) => void;
  requestViewReset: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedAtomIndices: [],
  showAtomLabels: false,
  viewResetRequestId: 0,
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
  setShowAtomLabels: (showAtomLabels) => set({ showAtomLabels }),
  requestViewReset: () => set((state) => ({
    viewResetRequestId: state.viewResetRequestId + 1,
  })),
}));
