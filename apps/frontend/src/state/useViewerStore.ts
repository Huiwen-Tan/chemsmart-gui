import { create } from 'zustand';

interface ViewerState {
  selectedAtomIndices: number[];
  showBonds: boolean;
  viewResetRequestId: number;
  toggleAtomSelection: (atomIndex: number) => void;
  clearAtomSelection: () => void;
  setShowBonds: (showBonds: boolean) => void;
  requestViewReset: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedAtomIndices: [],
  showBonds: true,
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
  setShowBonds: (showBonds) => set({ showBonds }),
  requestViewReset: () => set((state) => ({
    viewResetRequestId: state.viewResetRequestId + 1,
  })),
}));
