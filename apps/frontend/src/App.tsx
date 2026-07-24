import { useEffect, useState } from 'react';

import {
  generateMoleculeModeDisplacement,
  healthCheck,
  openDocument,
  previewBroadenedIrSpectrum,
  previewMoleculeExport,
} from './api/client';
import { AppShell, type WorkbenchMenuItems } from './app/AppShell';
import { DocumentSummaryPanel } from './documents/DocumentSummaryPanel';
import { MoleculeExportPreviewPanel } from './documents/MoleculeExportPreviewPanel';
import { TrajectoryFramesPanel } from './documents/TrajectoryFramesPanel';
import { VibrationalModesPanel } from './documents/VibrationalModesPanel';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { MolecularViewer } from './viewer/MolecularViewer';
import { SelectedAtomPanel } from './viewer/SelectedAtomPanel';
import { ViewerStatusBar } from './viewer/ViewerStatusBar';
import { ViewerToolbox } from './viewer/ViewerToolbox';
import { downloadTextFile } from './shared/download';
import type {
  ModeDisplacementDirection,
  MoleculeDocument,
  OpenedDocument,
  BroadenedIrSpectrumOptions,
  BroadenedIrSpectrumResponse,
  TrajectoryDocument,
  VibrationalMode,
} from './shared/types';

const REPLACE_UNSAVED_EDITS_MESSAGE =
  'Current molecule has unsaved edits. Open a different document and discard them?';
const REPLACE_UNSAVED_EDITS_FOR_DISPLACEMENT_MESSAGE =
  'Current molecule has unsaved edits. Generate a displaced structure and discard them?';
const XYZ_EXPORT_CONTENT_TYPE = 'chemical/x-xyz;charset=utf-8';
const DEFAULT_TRAJECTORY_PLAYBACK_FRAMES_PER_SECOND = 2;

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

function isTrajectoryDocument(
  document: OpenedDocument | null,
): document is TrajectoryDocument {
  return document?.document_kind === 'trajectory';
}

function moleculeDocumentForViewer(
  document: OpenedDocument | null,
  selectedTrajectoryFrameIndex: number,
): MoleculeDocument | null {
  if (!document) {
    return null;
  }
  if (document.document_kind === 'structure') {
    return document;
  }
  if (document.document_kind === 'trajectory') {
    return (
      document.frames[selectedTrajectoryFrameIndex] ??
      document.frames[0] ??
      null
    );
  }
  return document.molecules[0] ?? null;
}

function editableMoleculeDocument(
  document: OpenedDocument | null,
): MoleculeDocument | null {
  return document?.document_kind === 'structure' ? document : null;
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
  const selectedAtomIndices = useViewerStore(
    (state) => state.selectedAtomIndices,
  );
  const setShowBonds = useViewerStore((state) => state.setShowBonds);
  const showAtomLabels = useViewerStore((state) => state.showAtomLabels);
  const setShowAtomLabels = useViewerStore(
    (state) => state.setShowAtomLabels,
  );
  const requestViewReset = useViewerStore((state) => state.requestViewReset);
  const clearAtomSelection = useViewerStore(
    (state) => state.clearAtomSelection,
  );
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
  const [
    isDownloadingDisplacedStructure,
    setIsDownloadingDisplacedStructure,
  ] = useState(false);
  const [
    broadenedIrSpectrum,
    setBroadenedIrSpectrum,
  ] = useState<BroadenedIrSpectrumResponse | null>(null);
  const [
    broadenedIrSpectrumError,
    setBroadenedIrSpectrumError,
  ] = useState<string | null>(null);
  const [
    isPreviewingBroadenedIrSpectrum,
    setIsPreviewingBroadenedIrSpectrum,
  ] = useState(false);
  const [
    selectedTrajectoryFrameIndex,
    setSelectedTrajectoryFrameIndex,
  ] = useState(0);
  const [
    isTrajectoryPlaybackPlaying,
    setIsTrajectoryPlaybackPlaying,
  ] = useState(false);
  const [
    trajectoryPlaybackFramesPerSecond,
    setTrajectoryPlaybackFramesPerSecond,
  ] = useState(DEFAULT_TRAJECTORY_PLAYBACK_FRAMES_PER_SECOND);
  const trajectoryDocument = isTrajectoryDocument(currentDocument)
    ? currentDocument
    : null;
  const activeMoleculeDocument = moleculeDocumentForViewer(
    currentDocument,
    selectedTrajectoryFrameIndex,
  );
  const activeEditableMoleculeDocument = editableMoleculeDocument(
    currentDocument,
  );
  const vibrationalModes = activeMoleculeDocument?.vibrational_modes ?? [];
  const vibrationalModeIndexSignature = vibrationalModes
    .map((mode) => mode.index)
    .join(',');
  const selectedVibrationalMode = selectedVibrationalModeFromIndex(
    vibrationalModes,
    selectedVibrationalModeIndex,
  );
  const selectedVibrationalModeAnimationKey =
    activeMoleculeDocument && selectedVibrationalMode
      ? `${activeMoleculeDocument.id}:${selectedVibrationalMode.index}`
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
    setBroadenedIrSpectrum(null);
    setBroadenedIrSpectrumError(null);
  }, [activeMoleculeDocument?.id, vibrationalModeIndexSignature]);

  useEffect(() => {
    setSelectedTrajectoryFrameIndex(0);
    setIsTrajectoryPlaybackPlaying(false);
  }, [currentDocument?.id]);

  useEffect(() => {
    if (
      trajectoryDocument &&
      selectedTrajectoryFrameIndex >= trajectoryDocument.frames.length
    ) {
      setSelectedTrajectoryFrameIndex(0);
    }
  }, [selectedTrajectoryFrameIndex, trajectoryDocument]);

  useEffect(() => {
    if (!trajectoryDocument || trajectoryDocument.frames.length <= 1) {
      setIsTrajectoryPlaybackPlaying(false);
    }
  }, [trajectoryDocument]);

  useEffect(() => {
    if (
      !trajectoryDocument ||
      !isTrajectoryPlaybackPlaying ||
      trajectoryDocument.frames.length <= 1
    ) {
      return undefined;
    }

    const frameCount = trajectoryDocument.frames.length;
    const intervalMs = 1000 / trajectoryPlaybackFramesPerSecond;
    const intervalId = window.setInterval(() => {
      setActiveVibrationalModeAnimationKey(null);
      clearAtomSelection();
      setSelectedTrajectoryFrameIndex((currentFrameIndex) => (
        (currentFrameIndex + 1) % frameCount
      ));
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    clearAtomSelection,
    isTrajectoryPlaybackPlaying,
    trajectoryDocument,
    trajectoryPlaybackFramesPerSecond,
  ]);

  const selectVibrationalMode = (modeIndex: number): void => {
    setActiveVibrationalModeAnimationKey(null);
    setSelectedVibrationalModeIndex(modeIndex);
  };

  const selectTrajectoryFrame = (frameIndex: number): void => {
    setActiveVibrationalModeAnimationKey(null);
    clearAtomSelection();
    setSelectedTrajectoryFrameIndex(frameIndex);
  };

  const setVibrationalModeAnimationPlaying = (isPlaying: boolean): void => {
    setActiveVibrationalModeAnimationKey(
      isPlaying ? selectedVibrationalModeAnimationKey : null,
    );
  };

  const generateSelectedModeDisplacedStructure = async (
    direction: ModeDisplacementDirection,
  ): Promise<void> => {
    if (!activeMoleculeDocument || !selectedVibrationalMode) {
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
        document: activeMoleculeDocument,
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

  const previewActiveBroadenedIrSpectrum = async (
    options: BroadenedIrSpectrumOptions,
  ): Promise<void> => {
    if (!activeMoleculeDocument) {
      setBroadenedIrSpectrumError(
        'A molecule document is required before previewing an IR spectrum.',
      );
      return;
    }

    setBroadenedIrSpectrum(null);
    setBroadenedIrSpectrumError(null);
    setIsPreviewingBroadenedIrSpectrum(true);
    try {
      const response = await previewBroadenedIrSpectrum({
        document: activeMoleculeDocument,
        ...options,
      });
      setBroadenedIrSpectrum(response);
    } catch (err: unknown) {
      setBroadenedIrSpectrumError(
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setIsPreviewingBroadenedIrSpectrum(false);
    }
  };

  const downloadSelectedModeDisplacedStructure = async (
    direction: ModeDisplacementDirection,
  ): Promise<void> => {
    if (!activeMoleculeDocument || !selectedVibrationalMode) {
      setError(
        'A vibrational mode is required before downloading a displaced structure.',
      );
      return;
    }
    if (!selectedVibrationalModeCanAnimate) {
      setError('Selected vibrational mode has no displacement vectors.');
      return;
    }

    setError(null);
    setIsDownloadingDisplacedStructure(true);
    try {
      const displacementResponse = await generateMoleculeModeDisplacement({
        document: activeMoleculeDocument,
        mode_index: selectedVibrationalMode.index,
        direction,
        amplitude: 1,
      });
      const exportPreview = await previewMoleculeExport({
        document: displacementResponse.document,
        filetype: 'xyz',
      });
      downloadTextFile(
        exportPreview.filename,
        exportPreview.content,
        XYZ_EXPORT_CONTENT_TYPE,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDownloadingDisplacedStructure(false);
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

  const applicationMenuItems: WorkbenchMenuItems = {
    edit: [
      {
        disabled: !canUndoMoleculeEdit,
        id: 'undo-edit',
        kind: 'action',
        label: 'Undo Edit',
        onSelect: undoMoleculeEdit,
      },
      {
        disabled: !canRedoMoleculeEdit,
        id: 'redo-edit',
        kind: 'action',
        label: 'Redo Edit',
        onSelect: redoMoleculeEdit,
      },
    ],
    file: [
      {
        disabled: documentPath.trim().length === 0,
        id: 'open-document',
        kind: 'action',
        label: 'Open Document',
        onSelect: () => {
          void openCurrentDocument();
        },
      },
    ],
    view: [
      {
        id: 'reset-view',
        kind: 'action',
        label: 'Reset View',
        onSelect: requestViewReset,
      },
      {
        checked: showBonds,
        id: 'show-bonds',
        kind: 'checkbox',
        label: 'Show Bonds',
        onSelect: () => setShowBonds(!showBonds),
      },
      {
        checked: showAtomLabels,
        id: 'show-atom-labels',
        kind: 'checkbox',
        label: 'Show Atom Labels',
        onSelect: () => setShowAtomLabels(!showAtomLabels),
      },
    ],
  };

  const explorerSidebarPanel = (
    <>
      <p className="workbench-status-line">
        Backend health: <strong>{healthStatus}</strong>
      </p>
      <form
        className="workbench-form"
        onSubmit={(event) => {
          event.preventDefault();
          void openCurrentDocument();
        }}
      >
        <label className="workbench-field">
          <span className="workbench-field-label">Document path</span>
          <input
            className="workbench-input"
            onChange={(event) => setDocumentPath(event.currentTarget.value)}
            type="text"
            value={documentPath}
          />
        </label>
        <button
          className="workbench-button workbench-button-primary"
          type="submit"
        >
          Open Document
        </button>
      </form>
      {error ? <p className="workbench-error">Error: {error}</p> : null}
    </>
  );

  const displaySidebarPanel = (
    <>
      <label className="workbench-inline-control">
        <input
          checked={showBonds}
          onChange={(event) => setShowBonds(event.currentTarget.checked)}
          type="checkbox"
        />
        Show Bonds
      </label>
      <label className="workbench-inline-control">
        <input
          checked={showAtomLabels}
          onChange={(event) => setShowAtomLabels(event.currentTarget.checked)}
          type="checkbox"
        />
        Show Atom Labels
      </label>
      <div className="workbench-button-row">
        <button
          className="workbench-button"
          onClick={requestViewReset}
          type="button"
        >
          Reset View
        </button>
        <button
          className="workbench-button"
          disabled={!canUndoMoleculeEdit}
          onClick={undoMoleculeEdit}
          type="button"
        >
          Undo Edit
        </button>
        <button
          className="workbench-button"
          disabled={!canRedoMoleculeEdit}
          onClick={redoMoleculeEdit}
          type="button"
        >
          Redo Edit
        </button>
      </div>
    </>
  );

  return (
    <AppShell
      bottomDockPanels={{
        analysis: (
          <div className="workbench-panel-stack">
            {trajectoryDocument ? (
              <TrajectoryFramesPanel
                document={trajectoryDocument}
                isPlaybackPlaying={isTrajectoryPlaybackPlaying}
                onSelectedFrameIndexChange={selectTrajectoryFrame}
                onPlaybackFramesPerSecondChange={
                  setTrajectoryPlaybackFramesPerSecond
                }
                onPlaybackPlayingChange={setIsTrajectoryPlaybackPlaying}
                playbackFramesPerSecond={trajectoryPlaybackFramesPerSecond}
                selectedFrameIndex={selectedTrajectoryFrameIndex}
              />
            ) : null}
            <VibrationalModesPanel
              broadenedSpectrum={broadenedIrSpectrum}
              broadenedSpectrumError={broadenedIrSpectrumError}
              document={activeMoleculeDocument}
              isBroadenedSpectrumLoading={isPreviewingBroadenedIrSpectrum}
              isDownloadingDisplacedStructure={isDownloadingDisplacedStructure}
              isGeneratingDisplacedStructure={isGeneratingDisplacedStructure}
              isAnimationPlaying={isVibrationalModeAnimationPlaying}
              onAnimationPlayingChange={setVibrationalModeAnimationPlaying}
              onBroadenedSpectrumPreview={previewActiveBroadenedIrSpectrum}
              onDownloadDisplacedStructure={
                downloadSelectedModeDisplacedStructure
              }
              onGenerateDisplacedStructure={
                generateSelectedModeDisplacedStructure
              }
              onSelectedModeIndexChange={selectVibrationalMode}
              selectedModeIndex={selectedVibrationalMode?.index ?? null}
            />
          </div>
        ),
        export: (
          <MoleculeExportPreviewPanel
            document={activeEditableMoleculeDocument}
            onReopenSource={openDocumentPath}
            onSourceWrite={markMoleculeDocumentSaved}
          />
        ),
        properties: (
          <DocumentSummaryPanel
            document={activeMoleculeDocument}
            hasUnsavedMoleculeEdits={hasUnsavedMoleculeEdits}
          />
        ),
      }}
      menuItems={applicationMenuItems}
      rightPanelPanels={{
        details: (
          <SelectedAtomPanel document={activeEditableMoleculeDocument} />
        ),
      }}
      sidebarPanels={{
        explorer: explorerSidebarPanel,
        display: displaySidebarPanel,
      }}
      workspace={(
        <div className="workbench-viewer-workspace">
          <ViewerToolbox
            document={activeMoleculeDocument}
            onClearSelection={clearAtomSelection}
            onResetView={requestViewReset}
            onShowAtomLabelsChange={setShowAtomLabels}
            onShowBondsChange={setShowBonds}
            selectedAtomIndices={selectedAtomIndices}
            showAtomLabels={showAtomLabels}
            showBonds={showBonds}
          />
          <MolecularViewer
            document={activeMoleculeDocument}
            isVibrationalModeAnimationPlaying={
              isVibrationalModeAnimationPlaying
            }
            selectedVibrationalMode={selectedVibrationalMode}
          />
          <ViewerStatusBar
            document={activeMoleculeDocument}
            selectedAtomIndices={selectedAtomIndices}
            selectedTrajectoryFrameIndex={
              trajectoryDocument ? selectedTrajectoryFrameIndex : null
            }
            selectedVibrationalMode={selectedVibrationalMode}
            trajectoryFrameCount={trajectoryDocument?.frames.length ?? null}
          />
        </div>
      )}
    />
  );
}
