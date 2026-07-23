import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <main className="workbench-root">
      <h1 className="workbench-title">CHEMSMART GUI</h1>
      {children}
    </main>
  );
}
