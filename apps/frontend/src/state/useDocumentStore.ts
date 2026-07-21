import { create } from 'zustand';

import { applyMoleculeEdit } from '../api/client';
import type { MoleculeDocument, MoleculeEditCommand } from '../shared/types';
import { useViewerStore } from './useViewerStore';

interface MoleculeEditSnapshot {
  beforeDocument: MoleculeDocument;
  afterDocument: MoleculeDocument;
}

interface DocumentState {
  currentDocument: MoleculeDocument | null;
  canUndoMoleculeEdit: boolean;
  canRedoMoleculeEdit: boolean;
  hasUnsavedMoleculeEdits: boolean;
  isApplyingMoleculeEdit: boolean;
  moleculeEditError: string | null;
  moleculeEditUndoStack: MoleculeEditSnapshot[];
  moleculeEditRedoStack: MoleculeEditSnapshot[];
  setCurrentDocument: (document: MoleculeDocument | null) => void;
  markMoleculeDocumentSaved: (document: MoleculeDocument) => void;
  applyMoleculeEditCommand: (command: MoleculeEditCommand) => Promise<void>;
  undoMoleculeEdit: () => void;
  redoMoleculeEdit: () => void;
}

function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  canUndoMoleculeEdit: false,
  canRedoMoleculeEdit: false,
  hasUnsavedMoleculeEdits: false,
  isApplyingMoleculeEdit: false,
  moleculeEditError: null,
  moleculeEditUndoStack: [],
  moleculeEditRedoStack: [],
  setCurrentDocument: (document) => {
    useViewerStore.getState().clearAtomSelection();
    set({
      currentDocument: document,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      hasUnsavedMoleculeEdits: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [],
    });
  },
  markMoleculeDocumentSaved: (document) => {
    const currentDocument = get().currentDocument;
    if (!currentDocument) {
      set({
        moleculeEditError: 'No document is loaded.',
      });
      return;
    }
    if (currentDocument.id !== document.id) {
      set({
        moleculeEditError: 'Saved document does not match the active document.',
      });
      return;
    }

    set({
      currentDocument: document,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      hasUnsavedMoleculeEdits: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [],
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
      const undoStack = [
        ...get().moleculeEditUndoStack,
        {
          beforeDocument: document,
          afterDocument: response.document,
        },
      ];

      set({
        currentDocument: response.document,
        canUndoMoleculeEdit: undoStack.length > 0,
        canRedoMoleculeEdit: false,
        hasUnsavedMoleculeEdits: undoStack.length > 0,
        isApplyingMoleculeEdit: false,
        moleculeEditError: null,
        moleculeEditUndoStack: undoStack,
        moleculeEditRedoStack: [],
      });
    } catch (error: unknown) {
      set({
        isApplyingMoleculeEdit: false,
        moleculeEditError: messageFromUnknownError(error),
      });
    }
  },
  undoMoleculeEdit: () => {
    const { moleculeEditRedoStack, moleculeEditUndoStack } = get();
    const snapshot = moleculeEditUndoStack[moleculeEditUndoStack.length - 1];
    if (!snapshot) {
      set({ moleculeEditError: 'No molecule edit is available to undo.' });
      return;
    }

    const undoStack = moleculeEditUndoStack.slice(0, -1);
    const redoStack = [snapshot, ...moleculeEditRedoStack];
    set({
      currentDocument: snapshot.beforeDocument,
      canUndoMoleculeEdit: undoStack.length > 0,
      canRedoMoleculeEdit: redoStack.length > 0,
      hasUnsavedMoleculeEdits: undoStack.length > 0,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: undoStack,
      moleculeEditRedoStack: redoStack,
    });
  },
  redoMoleculeEdit: () => {
    const { moleculeEditRedoStack, moleculeEditUndoStack } = get();
    const snapshot = moleculeEditRedoStack[0];
    if (!snapshot) {
      set({ moleculeEditError: 'No molecule edit is available to redo.' });
      return;
    }

    const undoStack = [...moleculeEditUndoStack, snapshot];
    const redoStack = moleculeEditRedoStack.slice(1);
    set({
      currentDocument: snapshot.afterDocument,
      canUndoMoleculeEdit: undoStack.length > 0,
      canRedoMoleculeEdit: redoStack.length > 0,
      hasUnsavedMoleculeEdits: undoStack.length > 0,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: undoStack,
      moleculeEditRedoStack: redoStack,
    });
  },
}));
