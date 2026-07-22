import { useEffect, useState } from 'react';

import {
  generateMoleculeModeDisplacement,
  healthCheck,
  openDocument,
} from './api/client';
import { AppShell } from './app/AppShell';
import { DocumentSummaryPanel } from './documents/DocumentSummaryPanel';
import { MoleculeExportPreviewPanel } from './documents/MoleculeExportPreviewPanel';
import { VibrationalModesPanel } from './documents/VibrationalModesPanel';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { MolecularViewer } from './viewer/MolecularViewer';
import { SelectedAtomPanel } from './viewer/SelectedAtomPanel';
import type {
  ModeDisplacementDirection,
  VibrationalMode,
} from './shared/types';

const REPLACE_UNSAVED_EDITS_MESSAGE =
  'Current molecule has unsaved edits. Open a different document and discard them?';
const REPLACE_UNSAVED_EDITS_FOR_DISPLACEMENT_MESSAGE =
  'Current molecule has unsaved edits. Generate a displaced structure and discard them?';

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA'
  );
}

function selectedVibrationalModeFromIndex(
  modes: VibrationalMode[],
  selectedModeIndex: number | null,
): VibrationalMode | null {
  return (
    modes.find((mode) => mode.index === selectedModeIndex) ??
    modes[0] ??
    null
  );
}

export function App(): JSX.Element {
  const {
    canRedoMoleculeEdit,
    canUndoMoleculeEdit,
    currentDocument,
    hasUnsavedMoleculeEdits,
    markMoleculeDocumentSaved,
    redoMoleculeEdit,
    setCurrentDocument,
    undoMoleculeEdit,
  } = useDocumentStore();
  const showBonds = useViewerStore((state) => state.showBonds);
  const setShowBonds = useViewerStore((state) => state.setShowBonds);
  const showAtomLabels = useViewerStore((state) => state.showAtomLabels);
  const setShowAtomLabels = useViewerStore(
    (state) => state.setShowAtomLabels,
  );
  const requestViewReset = useViewerStore((state) => state.requestViewReset);
  const [healthStatus, setHealthStatus] = useState('checking...');
  const [error, setError] = useState<string | null>(null);
  const [documentPath, setDocumentPath] = useState('sample-data/water.xyz');
  const [
    selectedVibrationalModeIndex,
    setSelectedVibrationalModeIndex,
  ] = useState<number | null>(null);
  const [
    activeVibrationalModeAnimationKey,
    setActiveVibrationalModeAnimationKey,
  ] = useState<string | null>(null);
  const [
    isGeneratingDisplacedStructure,
    setIsGeneratingDisplacedStructure,
  ] = useState(false);
  const vibrationalModes = currentDocument?.vibrational_modes ?? [];
  const vibrationalModeIndexSignature = vibrationalModes
    .map((mode) => mode.index)
    .join(',');
  const selectedVibrationalMode = selectedVibrationalModeFromIndex(
    vibrationalModes,
    selectedVibrationalModeIndex,
  );
  const selectedVibrationalModeAnimationKey =
    currentDocument && selectedVibrationalMode
      ? `${currentDocument.id}:${selectedVibrationalMode.index}`
      : null;
  const selectedVibrationalModeCanAnimate =
    (selectedVibrationalMode?.displacements.length ?? 0) > 0;
  const isVibrationalModeAnimationPlaying =
    selectedVibrationalModeCanAnimate &&
    selectedVibrationalModeAnimationKey !== null &&
    activeVibrationalModeAnimationKey === selectedVibrationalModeAnimationKey;

  useEffect(() => {
    healthCheck()
      .then((response) => setHealthStatus(response.status))
      .catch((err: unknown) => {
        setHealthStatus('unavailable');
        setError(err instanceof Error ? err.message : 'Unknown error');
      });
  }, []);

  useEffect(() => {
    const handleEditHistoryShortcut = (event: KeyboardEvent): void => {
      if (isEditableShortcutTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasPrimaryModifier = event.metaKey || event.ctrlKey;
      if (!hasPrimaryModifier || event.altKey) {
        return;
      }

      if (key === 'z' && !event.shiftKey && canUndoMoleculeEdit) {
        event.preventDefault();
        undoMoleculeEdit();
        return;
      }

      const isRedoShortcut =
        (key === 'z' && event.shiftKey) ||
        (key === 'y' && !event.shiftKey);
      if (isRedoShortcut && canRedoMoleculeEdit) {
        event.preventDefault();
        redoMoleculeEdit();
      }
    };

    window.addEventListener('keydown', handleEditHistoryShortcut);
    return () => {
      window.removeEventListener('keydown', handleEditHistoryShortcut);
    };
  }, [
    canRedoMoleculeEdit,
    canUndoMoleculeEdit,
    redoMoleculeEdit,
    undoMoleculeEdit,
  ]);

  useEffect(() => {
    setSelectedVibrationalModeIndex(vibrationalModes[0]?.index ?? null);
    setActiveVibrationalModeAnimationKey(null);
  }, [currentDocument?.id, vibrationalModeIndexSignature]);

  const selectVibrationalMode = (modeIndex: number): void => {
    setActiveVibrationalModeAnimationKey(null);
    setSelectedVibrationalModeIndex(modeIndex);
  };

  const setVibrationalModeAnimationPlaying = (isPlaying: boolean): void => {
    setActiveVibrationalModeAnimationKey(
      isPlaying ? selectedVibrationalModeAnimationKey : null,
    );
  };

  const generateSelectedModeDisplacedStructure = async (
    direction: ModeDisplacementDirection,
  ): Promise<void> => {
    if (!currentDocument || !selectedVibrationalMode) {
      setError(
        'A vibrational mode is required before generating a displaced structure.',
      );
      return;
    }
    if (!selectedVibrationalModeCanAnimate) {
      setError('Selected vibrational mode has no displacement vectors.');
      return;
    }
    if (
      hasUnsavedMoleculeEdits &&
      !window.confirm(REPLACE_UNSAVED_EDITS_FOR_DISPLACEMENT_MESSAGE)
    ) {
      return;
    }

    setError(null);
    setIsGeneratingDisplacedStructure(true);
    setActiveVibrationalModeAnimationKey(null);
    try {
      const response = await generateMoleculeModeDisplacement({
        document: currentDocument,
        mode_index: selectedVibrationalMode.index,
        direction,
        amplitude: 1,
      });
      setCurrentDocument(response.document);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGeneratingDisplacedStructure(false);
    }
  };

  const openDocumentPath = async (pathOverride?: string): Promise<void> => {
    setError(null);
    const path = (pathOverride ?? documentPath).trim();
    if (!path) {
      setError('A document path is required.');
      return;
    }
    if (
      hasUnsavedMoleculeEdits &&
      !window.confirm(REPLACE_UNSAVED_EDITS_MESSAGE)
    ) {
      return;
    }

    try {
      const document = await openDocument({ path });
      setCurrentDocument(document);
      if (pathOverride !== undefined) {
        setDocumentPath(path);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const openCurrentDocument = async (): Promise<void> => {
    await openDocumentPath();
  };

  return (
    <AppShell>
      <p>Backend health: <strong>{healthStatus}</strong></p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void openCurrentDocument();
        }}
        style={{ marginBottom: 12 }}
      >
        <label style={{ display: 'inline-flex', gap: 6 }}>
          Document path
          <input
            onChange={(event) => setDocumentPath(event.currentTarget.value)}
            type="text"
            value={documentPath}
          />
        </label>
        <button style={{ marginLeft: 12 }} type="submit">
          Open Document
        </button>
      </form>
      <label style={{ display: 'inline-flex', gap: 6, marginLeft: 12 }}>
        <input
          checked={showBonds}
          onChange={(event) => setShowBonds(event.currentTarget.checked)}
          type="checkbox"
        />
        Show Bonds
      </label>
      <label style={{ display: 'inline-flex', gap: 6, marginLeft: 12 }}>
        <input
          checked={showAtomLabels}
          onChange={(event) => setShowAtomLabels(event.currentTarget.checked)}
          type="checkbox"
        />
        Show Atom Labels
      </label>
      <button
        onClick={requestViewReset}
        style={{ marginLeft: 12 }}
        type="button"
      >
        Reset View
      </button>
      <button
        disabled={!canUndoMoleculeEdit}
        onClick={undoMoleculeEdit}
        style={{ marginLeft: 12 }}
        type="button"
      >
        Undo Edit
      </button>
      <button
        disabled={!canRedoMoleculeEdit}
        onClick={redoMoleculeEdit}
        style={{ marginLeft: 12 }}
        type="button"
      >
        Redo Edit
      </button>
      {error ? <p style={{ color: '#ff8080' }}>Error: {error}</p> : null}
      <MolecularViewer
        document={currentDocument}
        isVibrationalModeAnimationPlaying={
          isVibrationalModeAnimationPlaying
        }
        selectedVibrationalMode={selectedVibrationalMode}
      />
      <DocumentSummaryPanel
        document={currentDocument}
        hasUnsavedMoleculeEdits={hasUnsavedMoleculeEdits}
      />
      <VibrationalModesPanel
        document={currentDocument}
        isGeneratingDisplacedStructure={isGeneratingDisplacedStructure}
        isAnimationPlaying={isVibrationalModeAnimationPlaying}
        onAnimationPlayingChange={setVibrationalModeAnimationPlaying}
        onGenerateDisplacedStructure={
          generateSelectedModeDisplacedStructure
        }
        onSelectedModeIndexChange={selectVibrationalMode}
        selectedModeIndex={selectedVibrationalMode?.index ?? null}
      />
      <MoleculeExportPreviewPanel
        document={currentDocument}
        onReopenSource={openDocumentPath}
        onSourceWrite={markMoleculeDocumentSaved}
      />
      <SelectedAtomPanel document={currentDocument} />
    </AppShell>
  );
}
