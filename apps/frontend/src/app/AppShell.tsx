import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  workspace?: ReactNode;
}

export function AppShell({
  children,
  workspace,
}: AppShellProps): JSX.Element {
  return (
    <div className="workbench-root">
      <header className="workbench-header">
        <div>
          <p className="workbench-eyebrow">CHEMSMART Workbench</p>
          <h1 className="workbench-title">CHEMSMART GUI</h1>
        </div>
      </header>
      <div className="workbench-layout">
        <aside
          aria-label="Primary workspace navigation"
          className="workbench-sidebar"
        >
          <p className="workbench-region-label">Explorer</p>
          <p className="workbench-placeholder">
            Project, document, and task navigation will appear here.
          </p>
        </aside>
        <main aria-label="Active workspace" className="workbench-main">
          {workspace ? (
            <>
              <section
                aria-label="Molecular viewer workspace"
                className="workbench-viewer-slot"
              >
                {workspace}
              </section>
              <section
                aria-label="Legacy workspace content"
                className="workbench-legacy-content"
              >
                {children}
              </section>
            </>
          ) : (
            children
          )}
        </main>
        <aside aria-label="Context panel" className="workbench-right-rail">
          <p className="workbench-region-label">Context</p>
          <p className="workbench-placeholder">
            Analysis details and contextual tools will dock here.
          </p>
        </aside>
        <section aria-label="Workbench dock" className="workbench-bottom-dock">
          <p className="workbench-region-label">Dock</p>
          <p className="workbench-placeholder">
            Properties, export, logs, and analysis tabs will live here.
          </p>
        </section>
      </div>
    </div>
  );
}
