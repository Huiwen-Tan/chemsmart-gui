import { useEffect, useRef, useState } from 'react';

import {
  generateMoleculeModeDisplacement,
  healthCheck,
  importDocument,
  openDocument,
  previewBroadenedIrSpectrum,
  previewMoleculeExport,
} from './api/client';
import { AppShell, type WorkbenchMenuItems } from './app/AppShell';
import { WorkbenchDialog } from './app/WorkbenchDialog';
import { DocumentOpenPanel } from './documents/DocumentOpenPanel';
import { DocumentSummaryPanel } from './documents/DocumentSummaryPanel';
import { IrSpectrumPanel } from './documents/IrSpectrumPanel';
import { MoleculeExportPreviewPanel } from './documents/MoleculeExportPreviewPanel';
import { TrajectoryEnergyProfile } from './documents/TrajectoryEnergyProfile';
import { VibrationalModesPanel } from './documents/VibrationalModesPanel';
import { TaskCatalogPanel } from './tasks/TaskCatalogPanel';
import {
  SettingsDrawer,
  type SettingsDrawerSection,
} from './settings/SettingsDrawer';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { MolecularViewer } from './viewer/MolecularViewer';
import { SelectedAtomPanel } from './viewer/SelectedAtomPanel';
import { ViewerPlaybackControls } from './viewer/ViewerPlaybackControls';
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
const FIXED_TRAJECTORY_PLAYBACK_FRAMES_PER_SECOND = 20;

type ResultsDialogId =
  | 'summary'
  | 'vibrations'
  | 'ir-spectrum'
  | 'trajectory';

const RESULTS_DIALOG_COPY: Record<
  ResultsDialogId,
  { description: string; title: string }
> = {
  summary: {
    title: 'Summary',
    description: 'Document metadata and calculation context.',
  },
  vibrations: {
    title: 'Vibrations',
    description: 'Parsed vibrational modes and displacement controls.',
  },
  'ir-spectrum': {
    title: 'IR Spectrum',
    description: 'Stick and broadened IR spectrum from parsed modes.',
  },
  trajectory: {
    title: 'Trajectory',
    description: 'Parsed trajectory frames and their energy profile.',
  },
};

function pluralizedCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function openedDocumentStatus(
  document: OpenedDocument,
  importedFilename?: string,
): string {
  const filename = importedFilename ?? document.source?.filename ?? document.name;

  if (document.document_kind === 'trajectory') {
    const atomCount = document.frames[0]?.atoms.length ?? 0;
    return [
      `Opened ${filename}`,
      pluralizedCount(atomCount, 'atom'),
      pluralizedCount(document.frames.length, 'frame'),
    ].join(' · ');
  }

  if (document.document_kind === 'calculation_result') {
    const atomCount = document.molecules[0]?.atoms.length ?? 0;
    return [
      `Opened ${filename}`,
      pluralizedCount(atomCount, 'atom'),
      pluralizedCount(document.molecules.length, 'molecule'),
    ].join(' · ');
  }

  const details = [
    `Opened ${filename}`,
    pluralizedCount(document.atoms.length, 'atom'),
  ];
  if (document.vibrational_modes.length > 0) {
    details.push(
      pluralizedCount(document.vibrational_modes.length, 'vibrational mode'),
    );
  }
  return details.join(' · ');
}

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
  return modes.find((mode) => mode.index === selectedModeIndex) ?? null;
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
  const selectedAtomIndices = useViewerStore(
    (state) => state.selectedAtomIndices,
  );
  const showAtomLabels = useViewerStore((state) => state.showAtomLabels);
  const setShowAtomLabels = useViewerStore(
    (state) => state.setShowAtomLabels,
  );
  const requestViewReset = useViewerStore((state) => state.requestViewReset);
  const clearAtomSelection = useViewerStore(
    (state) => state.clearAtomSelection,
  );
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [healthStatus, setHealthStatus] = useState('checking...');
  const [error, setError] = useState<string | null>(null);
  const [
    selectedVibrationalModeIndex,
    setSelectedVibrationalModeIndex,
  ] = useState<number | null>(null);
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [documentOpenStatus, setDocumentOpenStatus] = useState<string | null>(
    null,
  );
  const [openingDocumentName, setOpeningDocumentName] = useState<string | null>(
    null,
  );
  const [
    showVibrationalModeDisplacementVectors,
    setShowVibrationalModeDisplacementVectors,
  ] = useState(false);
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
    settingsDrawerSection,
    setSettingsDrawerSection,
  ] = useState<SettingsDrawerSection>('project');
  const [
    isSettingsDrawerOpen,
    setIsSettingsDrawerOpen,
  ] = useState(false);
  const [
    activeResultsDialog,
    setActiveResultsDialog,
  ] = useState<ResultsDialogId | null>(null);
  const trajectoryDocument = isTrajectoryDocument(currentDocument)
    ? currentDocument
    : null;
  const activeMoleculeDocument = moleculeDocumentForViewer(
    currentDocument,
    selectedTrajectoryFrameIndex,
  );
  const viewerAutoFrameKey = currentDocument?.id ?? null;
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
    setSelectedVibrationalModeIndex(null);
    setShowVibrationalModeDisplacementVectors(false);
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

    const lastFrameIndex = trajectoryDocument.frames.length - 1;
    const intervalMs = 1000 / FIXED_TRAJECTORY_PLAYBACK_FRAMES_PER_SECOND;
    const intervalId = window.setInterval(() => {
      setActiveVibrationalModeAnimationKey(null);
      clearAtomSelection();
      setSelectedTrajectoryFrameIndex((currentFrameIndex) => (
        Math.min(currentFrameIndex + 1, lastFrameIndex)
      ));
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    clearAtomSelection,
    isTrajectoryPlaybackPlaying,
    trajectoryDocument,
  ]);

  useEffect(() => {
    if (
      trajectoryDocument &&
      isTrajectoryPlaybackPlaying &&
      selectedTrajectoryFrameIndex >= trajectoryDocument.frames.length - 1
    ) {
      setIsTrajectoryPlaybackPlaying(false);
    }
  }, [
    isTrajectoryPlaybackPlaying,
    selectedTrajectoryFrameIndex,
    trajectoryDocument,
  ]);

  const selectVibrationalMode = (modeIndex: number): void => {
    setActiveVibrationalModeAnimationKey(null);
    setSelectedVibrationalModeIndex(modeIndex);
    setShowVibrationalModeDisplacementVectors(true);
  };

  const selectTrajectoryFrame = (frameIndex: number): void => {
    setActiveVibrationalModeAnimationKey(null);
    clearAtomSelection();
    setSelectedTrajectoryFrameIndex(frameIndex);
  };

  const setTrajectoryPlaybackPlaying = (isPlaying: boolean): void => {
    if (
      isPlaying &&
      trajectoryDocument &&
      selectedTrajectoryFrameIndex >= trajectoryDocument.frames.length - 1
    ) {
      selectTrajectoryFrame(0);
    }
    setIsTrajectoryPlaybackPlaying(isPlaying);
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

  const openDocumentPath = async (path: string): Promise<void> => {
    setError(null);
    setDocumentOpenStatus(null);
    const trimmedPath = path.trim();
    if (!trimmedPath) {
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
      setOpeningDocumentName(trimmedPath);
      setIsOpeningDocument(true);
      const document = await openDocument({ path: trimmedPath });
      setCurrentDocument(document);
      setDocumentOpenStatus(openedDocumentStatus(document));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setOpeningDocumentName(null);
      setIsOpeningDocument(false);
    }
  };

  const chooseDocumentFile = (): void => {
    documentFileInputRef.current?.click();
  };

  const openDocumentFile = async (file: File): Promise<void> => {
    setError(null);
    setDocumentOpenStatus(null);
    if (
      hasUnsavedMoleculeEdits &&
      !window.confirm(REPLACE_UNSAVED_EDITS_MESSAGE)
    ) {
      return;
    }

    try {
      setOpeningDocumentName(file.name);
      setIsOpeningDocument(true);
      const document = await importDocument(file);
      setCurrentDocument(document);
      setDocumentOpenStatus(openedDocumentStatus(document, file.name));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setOpeningDocumentName(null);
      setIsOpeningDocument(false);
    }
  };

  const openSettingsDrawer = (section: SettingsDrawerSection): void => {
    setSettingsDrawerSection(section);
    setIsSettingsDrawerOpen(true);
  };

  const openResultsDialog = (dialogId: ResultsDialogId): void => {
    if (dialogId !== 'trajectory') {
      setIsTrajectoryPlaybackPlaying(false);
    }
    setActiveResultsDialog(dialogId);
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
        disabled: isOpeningDocument,
        id: 'open-document',
        kind: 'action',
        label: 'Open Document',
        onSelect: chooseDocumentFile,
      },
    ],
    settings: [
      {
        id: 'project-settings',
        kind: 'action',
        label: 'Project Settings (Preview)...',
        onSelect: () => openSettingsDrawer('project'),
      },
      {
        id: 'server-settings',
        kind: 'action',
        label: 'Server Settings (Preview)...',
        onSelect: () => openSettingsDrawer('server'),
      },
    ],
    results: [
      {
        disabled: !activeMoleculeDocument,
        id: 'results-summary',
        kind: 'action',
        label: 'Summary',
        onSelect: () => openResultsDialog('summary'),
      },
      {
        id: 'results-primary-separator',
        kind: 'separator',
      },
      {
        disabled: vibrationalModes.length === 0,
        id: 'results-vibrations',
        kind: 'action',
        label: 'Vibrations',
        onSelect: () => openResultsDialog('vibrations'),
      },
      {
        disabled: vibrationalModes.length === 0,
        id: 'results-ir-spectrum',
        kind: 'action',
        label: 'IR Spectrum',
        onSelect: () => openResultsDialog('ir-spectrum'),
      },
      {
        description: 'Requires charge-analysis data from the backend.',
        disabled: true,
        id: 'results-charge-distribution',
        kind: 'action',
        label: 'Charge Distribution',
      },
      {
        id: 'results-trajectory-separator',
        kind: 'separator',
      },
      {
        disabled: !trajectoryDocument,
        id: 'results-trajectory',
        kind: 'action',
        label: 'Trajectory',
        onSelect: () => openResultsDialog('trajectory'),
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
        checked: showAtomLabels,
        id: 'show-atom-labels',
        kind: 'checkbox',
        label: 'Show Atom Labels',
        onSelect: () => setShowAtomLabels(!showAtomLabels),
      },
    ],
  };

  const explorerSidebarPanel = (
    <DocumentOpenPanel
      backendHealthStatus={healthStatus}
      error={error}
      isOpeningDocument={isOpeningDocument}
      documentOpenStatus={documentOpenStatus}
      onChooseDocument={chooseDocumentFile}
      openingDocumentName={openingDocumentName}
    />
  );

  const displaySidebarPanel = (
    <>
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
  const activeResultsDialogCopy = activeResultsDialog
    ? RESULTS_DIALOG_COPY[activeResultsDialog]
    : null;
  const resultsDialogContent = (() => {
    switch (activeResultsDialog) {
      case 'summary':
        return (
          <DocumentSummaryPanel
            document={activeMoleculeDocument}
            hasUnsavedMoleculeEdits={hasUnsavedMoleculeEdits}
          />
        );
      case 'vibrations':
        return (
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
            showDisplacementVectors={showVibrationalModeDisplacementVectors}
            onShowDisplacementVectorsChange={
              setShowVibrationalModeDisplacementVectors
            }
            showIrSpectrum={false}
          />
        );
      case 'ir-spectrum':
        return (
          <IrSpectrumPanel
            broadenedSpectrum={broadenedIrSpectrum}
            broadenedSpectrumError={broadenedIrSpectrumError}
            document={activeMoleculeDocument}
            isBroadenedSpectrumLoading={isPreviewingBroadenedIrSpectrum}
            onBroadenedSpectrumPreview={previewActiveBroadenedIrSpectrum}
            onSelectedModeIndexChange={selectVibrationalMode}
            selectedModeIndex={selectedVibrationalMode?.index ?? null}
          />
        );
      case 'trajectory':
        return (
          <TrajectoryEnergyProfile
            document={trajectoryDocument}
            onSelectedFrameIndexChange={selectTrajectoryFrame}
            selectedFrameIndex={selectedTrajectoryFrameIndex}
          />
        );
      default:
        return (
          <p className="workbench-result-placeholder">
            Select a result from the Results menu.
          </p>
        );
    }
  })();

  return (
    <>
      <input
        accept=".xyz,.com,.gjf,.inp,.log,.out"
        aria-label="Choose document file"
        className="workbench-visually-hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) {
            void openDocumentFile(file);
          }
        }}
        ref={documentFileInputRef}
        type="file"
      />
      <AppShell
        bottomDock={(
          <MoleculeExportPreviewPanel
            document={activeEditableMoleculeDocument}
            onReopenSource={openDocumentPath}
            onSourceWrite={markMoleculeDocumentSaved}
          />
        )}
        menuItems={applicationMenuItems}
        rightPanelPanels={{
          details: (
            <SelectedAtomPanel document={activeEditableMoleculeDocument} />
          ),
        }}
        sidebarPanels={{
          explorer: explorerSidebarPanel,
          tasks: <TaskCatalogPanel />,
          display: displaySidebarPanel,
        }}
        workspace={(
          <div className="workbench-viewer-workspace">
            <div className="workbench-viewer-stage">
              <MolecularViewer
                autoFrameKey={viewerAutoFrameKey}
                document={activeMoleculeDocument}
                isVibrationalModeAnimationPlaying={
                  isVibrationalModeAnimationPlaying
                }
                selectedVibrationalMode={selectedVibrationalMode}
                showVibrationalModeDisplacementVectors={
                  showVibrationalModeDisplacementVectors
                }
              />
              <ViewerToolbox
                document={activeMoleculeDocument}
                onClearSelection={clearAtomSelection}
                onResetView={requestViewReset}
                onShowAtomLabelsChange={setShowAtomLabels}
                selectedAtomIndices={selectedAtomIndices}
                showAtomLabels={showAtomLabels}
              />
            </div>
            <ViewerStatusBar
              document={activeMoleculeDocument}
              selectedAtomIndices={selectedAtomIndices}
              selectedVibrationalMode={selectedVibrationalMode}
            />
            <ViewerPlaybackControls
              isTrajectoryPlaybackPlaying={isTrajectoryPlaybackPlaying}
              onSelectedTrajectoryFrameIndexChange={selectTrajectoryFrame}
              onTrajectoryPlaybackPlayingChange={setTrajectoryPlaybackPlaying}
              selectedTrajectoryFrameIndex={selectedTrajectoryFrameIndex}
              trajectoryDocument={trajectoryDocument}
            />
          </div>
        )}
      />
      <SettingsDrawer
        activeSection={settingsDrawerSection}
        isOpen={isSettingsDrawerOpen}
        onActiveSectionChange={setSettingsDrawerSection}
        onClose={() => setIsSettingsDrawerOpen(false)}
      />
      {activeResultsDialogCopy ? (
        <WorkbenchDialog
          description={activeResultsDialogCopy.description}
          isOpen={activeResultsDialog !== null}
          onClose={() => setActiveResultsDialog(null)}
          title={activeResultsDialogCopy.title}
        >
          {resultsDialogContent}
        </WorkbenchDialog>
      ) : null}
    </>
  );
}
