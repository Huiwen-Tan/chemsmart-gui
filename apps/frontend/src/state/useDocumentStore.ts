import { create } from 'zustand';

import { applyMoleculeEdit } from '../api/client';
import type { MoleculeDocument, MoleculeEditCommand } from '../shared/types';
import { useViewerStore } from './useViewerStore';

interface DocumentState {
  currentDocument: MoleculeDocument | null;
  canUndoMoleculeEdit: boolean;
  canRedoMoleculeEdit: boolean;
  isApplyingMoleculeEdit: boolean;
  moleculeEditError: string | null;
  setCurrentDocument: (document: MoleculeDocument | null) => void;
  applyMoleculeEditCommand: (command: MoleculeEditCommand) => Promise<void>;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  canUndoMoleculeEdit: false,
  canRedoMoleculeEdit: false,
  isApplyingMoleculeEdit: false,
  moleculeEditError: null,
  setCurrentDocument: (document) => {
    useViewerStore.getState().clearAtomSelection();
    set({
      currentDocument: document,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
    });
  },
  applyMoleculeEditCommand: async (command) => {
    const document = get().currentDocument;
    if (!document) {
      set({
        isApplyingMoleculeEdit: false,
        moleculeEditError: 'No document is loaded.',
      });
      return;
    }

    set({
      isApplyingMoleculeEdit: true,
      moleculeEditError: null,
    });

    try {
      const response = await applyMoleculeEdit({
        document,
        command,
      });

      set({
        currentDocument: response.document,
        canUndoMoleculeEdit: response.can_undo,
        canRedoMoleculeEdit: response.can_redo,
        isApplyingMoleculeEdit: false,
        moleculeEditError: null,
      });
    } catch (error: unknown) {
      set({
        isApplyingMoleculeEdit: false,
        moleculeEditError: messageFromUnknownError(error),
      });
    }
  },
}));
