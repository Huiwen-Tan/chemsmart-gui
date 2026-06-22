import { useEffect, useState } from 'react';

import { healthCheck, openDocument } from './api/client';
import { AppShell } from './app/AppShell';
import { DocumentSummaryPanel } from './documents/DocumentSummaryPanel';
import { useDocumentStore } from './state/useDocumentStore';
import { useViewerStore } from './state/useViewerStore';
import { MolecularViewer } from './viewer/MolecularViewer';
import { SelectedAtomPanel } from './viewer/SelectedAtomPanel';

export function App(): JSX.Element {
  const { currentDocument, setCurrentDocument } = useDocumentStore();
  const showBonds = useViewerStore((state) => state.showBonds);
  const setShowBonds = useViewerStore((state) => state.setShowBonds);
  const showAtomLabels = useViewerStore((state) => state.showAtomLabels);
  const setShowAtomLabels = useViewerStore(
    (state) => state.setShowAtomLabels,
  );
  const requestViewReset = useViewerStore((state) => state.requestViewReset);
  const [healthStatus, setHealthStatus] = useState('checking...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthCheck()
      .then((response) => setHealthStatus(response.status))
      .catch((err: unknown) => {
        setHealthStatus('unavailable');
        setError(err instanceof Error ? err.message : 'Unknown error');
      });
  }, []);

  const loadSampleMolecule = async (): Promise<void> => {
    setError(null);
    try {
      const document = await openDocument({ path: 'sample-data/water.xyz' });
      setCurrentDocument(document);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <AppShell>
      <p>Backend health: <strong>{healthStatus}</strong></p>
      <button onClick={() => void loadSampleMolecule()} style={{ marginBottom: 12 }}>
        Load Sample Molecule
      </button>
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
      {error ? <p style={{ color: '#ff8080' }}>Error: {error}</p> : null}
      <MolecularViewer document={currentDocument} />
      <DocumentSummaryPanel document={currentDocument} />
      <SelectedAtomPanel document={currentDocument} />
    </AppShell>
  );
}
