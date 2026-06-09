import { create } from 'zustand';

import type { MoleculeDocument } from '../shared/types';

interface DocumentState {
  currentDocument: MoleculeDocument | null;
  setCurrentDocument: (document: MoleculeDocument | null) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  currentDocument: null,
  setCurrentDocument: (document) => set({ currentDocument: document }),
}));
