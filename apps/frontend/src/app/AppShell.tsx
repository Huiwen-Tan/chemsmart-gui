import { useState, type ReactNode } from 'react';

type SidebarView = 'explorer' | 'tasks' | 'display';

const SIDEBAR_VIEWS: ReadonlyArray<{
  id: SidebarView;
  label: string;
}> = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'display', label: 'Display' },
];

const SIDEBAR_VIEW_CONTENT: Record<
  SidebarView,
  { description: string; heading: string }
> = {
  explorer: {
    heading: 'Explorer',
    description: 'Project and document navigation will appear here.',
  },
  tasks: {
    heading: 'Tasks',
    description: 'CHEMSMART task catalog shortcuts will appear here.',
  },
  display: {
    heading: 'Display',
    description: 'Viewer display and representation controls will appear here.',
  },
};

interface AppShellProps {
  children: ReactNode;
  workspace?: ReactNode;
}

export function AppShell({
  children,
  workspace,
}: AppShellProps): JSX.Element {
  const [activeSidebarView, setActiveSidebarView] =
    useState<SidebarView>('explorer');
  const activeSidebarContent = SIDEBAR_VIEW_CONTENT[activeSidebarView];

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
          <nav
            aria-label="Primary sidebar views"
            className="workbench-sidebar-switcher"
          >
            {SIDEBAR_VIEWS.map((view) => (
              <button
                aria-pressed={activeSidebarView === view.id}
                className="workbench-sidebar-view-button"
                key={view.id}
                onClick={() => setActiveSidebarView(view.id)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </nav>
          <section
            aria-label={`${activeSidebarContent.heading} sidebar panel`}
            className="workbench-sidebar-panel"
          >
            <p className="workbench-region-label">
              {activeSidebarContent.heading}
            </p>
            <p className="workbench-placeholder">
              {activeSidebarContent.description}
            </p>
          </section>
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
