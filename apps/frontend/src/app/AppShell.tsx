import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <main style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 16, color: '#f3f6fa', background: '#0d1117', minHeight: '100vh' }}>
      <h1 style={{ marginTop: 0 }}>CHEMSMART GUI</h1>
      {children}
    </main>
  );
}
