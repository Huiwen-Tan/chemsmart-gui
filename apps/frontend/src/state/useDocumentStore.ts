import { create } from 'zustand';

import type { MoleculeDocument } from '../shared/types';
import { useViewerStore } from './useViewerStore';

interface DocumentState {
  currentDocument: MoleculeDocument | null;
  setCurrentDocument: (document: MoleculeDocument | null) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  currentDocument: null,
  setCurrentDocument: (document) => {
    useViewerStore.getState().clearAtomSelection();
    set({ currentDocument: document });
  },
}));
