import { useEffect, useState } from 'react';

import { healthCheck, openDocument } from './api/client';
import { AppShell } from './app/AppShell';
import { useDocumentStore } from './state/useDocumentStore';
import { MolecularViewer } from './viewer/MolecularViewer';

export function App(): JSX.Element {
  const { currentDocument, setCurrentDocument } = useDocumentStore();
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
      {error ? <p style={{ color: '#ff8080' }}>Error: {error}</p> : null}
      <MolecularViewer document={currentDocument} />
    </AppShell>
  );
}
