import { useState, type ReactNode } from 'react';

type SidebarView = 'explorer' | 'tasks' | 'display';
type BottomDockTab = 'properties' | 'export' | 'logs' | 'analysis';
type RightPanelTab = 'details' | 'inspector';

interface PlaceholderTab<T extends string> {
  description: string;
  id: T;
  label: string;
}

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

const BOTTOM_DOCK_TABS: ReadonlyArray<PlaceholderTab<BottomDockTab>> = [
  {
    id: 'properties',
    label: 'Properties',
    description: 'Document and selection properties will appear here.',
  },
  {
    id: 'export',
    label: 'Export',
    description: 'Export previews and save actions will appear here.',
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Application and workflow logs will appear here.',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    description: 'Frequency, trajectory, and spectrum panels will appear here.',
  },
];

const RIGHT_PANEL_TABS: ReadonlyArray<PlaceholderTab<RightPanelTab>> = [
  {
    id: 'details',
    label: 'Details',
    description: 'Contextual analysis details will appear here.',
  },
  {
    id: 'inspector',
    label: 'Inspector',
    description: 'Document and viewer inspector controls will appear here.',
  },
];

interface AppShellProps {
  bottomDock?: ReactNode;
  bottomDockPanels?: Partial<Record<BottomDockTab, ReactNode>>;
  children?: ReactNode;
  rightPanel?: ReactNode;
  rightPanelPanels?: Partial<Record<RightPanelTab, ReactNode>>;
  sidebarPanels?: Partial<Record<SidebarView, ReactNode>>;
  workspace?: ReactNode;
}

export function AppShell({
  bottomDock,
  bottomDockPanels,
  children,
  rightPanel,
  rightPanelPanels,
  sidebarPanels,
  workspace,
}: AppShellProps): JSX.Element {
  const [activeSidebarView, setActiveSidebarView] =
    useState<SidebarView>('explorer');
  const [activeBottomDockTab, setActiveBottomDockTab] =
    useState<BottomDockTab>('properties');
  const [activeRightPanelTab, setActiveRightPanelTab] =
    useState<RightPanelTab>('details');
  const activeSidebarContent = SIDEBAR_VIEW_CONTENT[activeSidebarView];
  const activeSidebarPanel = sidebarPanels?.[activeSidebarView];
  const hasLegacyContent = children !== undefined && children !== null;

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
            {activeSidebarPanel ? (
              <div className="workbench-panel-stack">
                {activeSidebarPanel}
              </div>
            ) : (
              <p className="workbench-placeholder">
                {activeSidebarContent.description}
              </p>
            )}
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
              {hasLegacyContent ? (
                <section
                  aria-label="Legacy workspace content"
                  className="workbench-legacy-content"
                >
                  {children}
                </section>
              ) : null}
            </>
          ) : (
            children
          )}
        </main>
        <aside aria-label="Context panel" className="workbench-right-rail">
          {rightPanel ? (
            <section
              aria-label="Custom right panel content"
              className="workbench-panel-slot"
            >
              {rightPanel}
            </section>
          ) : (
            <PlaceholderTabs
              activeTab={activeRightPanelTab}
              ariaLabel="Context panel tabs"
              idPrefix="workbench-right-panel"
              onActiveTabChange={setActiveRightPanelTab}
              panelContent={rightPanelPanels}
              tabs={RIGHT_PANEL_TABS}
            />
          )}
        </aside>
        <section aria-label="Workbench dock" className="workbench-bottom-dock">
          {bottomDock ? (
            <section
              aria-label="Custom bottom dock content"
              className="workbench-panel-slot"
            >
              {bottomDock}
            </section>
          ) : (
            <PlaceholderTabs
              activeTab={activeBottomDockTab}
              ariaLabel="Workbench dock tabs"
              idPrefix="workbench-bottom-dock"
              onActiveTabChange={setActiveBottomDockTab}
              panelContent={bottomDockPanels}
              tabs={BOTTOM_DOCK_TABS}
            />
          )}
        </section>
      </div>
    </div>
  );
}

interface PlaceholderTabsProps<T extends string> {
  activeTab: T;
  ariaLabel: string;
  idPrefix: string;
  onActiveTabChange: (tab: T) => void;
  panelContent?: Partial<Record<T, ReactNode>>;
  tabs: ReadonlyArray<PlaceholderTab<T>>;
}

function PlaceholderTabs<T extends string>({
  activeTab,
  ariaLabel,
  idPrefix,
  onActiveTabChange,
  panelContent,
  tabs,
}: PlaceholderTabsProps<T>): JSX.Element {
  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="workbench-panel-tabs"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabId = `${idPrefix}-${tab.id}-tab`;

          return (
            <button
              aria-controls={`${idPrefix}-${tab.id}-panel`}
              aria-selected={isActive}
              className="workbench-panel-tab"
              id={tabId}
              key={tab.id}
              onClick={() => onActiveTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <section
            aria-labelledby={`${idPrefix}-${tab.id}-tab`}
            className="workbench-panel-slot"
            hidden={!isActive}
            id={`${idPrefix}-${tab.id}-panel`}
            key={tab.id}
            role="tabpanel"
          >
            {panelContent?.[tab.id] ?? (
              <>
                <p className="workbench-region-label">{tab.label}</p>
                <p className="workbench-placeholder">{tab.description}</p>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
