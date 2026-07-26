import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from './AppShell';

const WORKBENCH_LAYOUT_PREFERENCES_STORAGE_KEY =
  'chemsmart-gui.workbench.layout.v1';

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders its title and child content', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const workspace = shell.getByRole('main', { name: 'Active workspace' });

    expect(
      shell.getByRole('heading', { name: 'CHEMSMART GUI' }),
    ).toBeInTheDocument();
    expect(within(workspace).getByText('Workspace content')).toBeInTheDocument();
  });

  it('uses the workbench shell classes', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);

    expect(container.querySelector('.workbench-root')).toBeInTheDocument();
    expect(shell.getByRole('banner')).toHaveClass('workbench-header');
    expect(
      shell.getByRole('complementary', {
        name: 'Primary workspace navigation',
      }),
    ).toHaveClass('workbench-sidebar');
    expect(
      shell.getByRole('main', { name: 'Active workspace' }),
    ).toHaveClass('workbench-main');
    expect(
      shell.getByRole('complementary', { name: 'Context panel' }),
    ).toHaveClass('workbench-right-rail');
    expect(
      shell.getByRole('region', { name: 'Workbench dock' }),
    ).toHaveClass('workbench-bottom-dock');
    expect(container.querySelector('h1')).toHaveClass('workbench-title');
  });

  it('renders placeholder labels for future workbench regions', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);

    expect(
      shell.getByRole('button', { name: 'Explorer' }),
    ).toBeInTheDocument();
    expect(
      shell.getByRole('region', { name: 'Explorer sidebar panel' }),
    ).toBeInTheDocument();
    expect(
      shell.getByRole('complementary', { name: 'Context panel' }),
    ).toBeInTheDocument();
    expect(
      shell.getByRole('tablist', { name: 'Context panel tabs' }),
    ).toBeInTheDocument();
    expect(
      shell.getByRole('tablist', { name: 'Workbench dock tabs' }),
    ).toBeInTheDocument();
  });

  it('renders the application menu command groups', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const menu = shell.getByRole('navigation', { name: 'Application menu' });

    for (const groupName of [
      'File',
      'Edit',
      'View',
      'Calculate',
      'Results',
      'Settings',
    ]) {
      expect(within(menu).getByRole('button', { name: groupName }))
        .toBeInTheDocument();
    }
  });

  it('runs custom application menu actions', () => {
    const openDocument = vi.fn();
    const { container } = render(
      <AppShell
        menuItems={{
          file: [
            {
              id: 'open-document',
              kind: 'action',
              label: 'Open Document',
              onSelect: openDocument,
            },
          ],
        }}
      >
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);

    fireEvent.click(shell.getByRole('button', { name: 'File' }));
    const fileMenu = shell.getByRole('menu', { name: 'File menu' });
    fireEvent.click(
      within(fileMenu).getByRole('menuitem', { name: 'Open Document' }),
    );

    expect(openDocument).toHaveBeenCalledTimes(1);
    expect(
      shell.queryByRole('menu', { name: 'File menu' }),
    ).not.toBeInTheDocument();
  });

  it('closes an open application menu after outside interaction', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);

    fireEvent.click(shell.getByRole('button', { name: 'View' }));
    expect(shell.getByRole('menu', { name: 'View menu' })).toBeInTheDocument();

    fireEvent.pointerDown(shell.getByRole('main', { name: 'Active workspace' }));
    expect(
      shell.queryByRole('menu', { name: 'View menu' }),
    ).not.toBeInTheDocument();
  });

  it('switches workbench regions from application menu commands', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });

    fireEvent.click(shell.getByRole('button', { name: 'View' }));
    fireEvent.click(
      within(shell.getByRole('menu', { name: 'View menu' })).getByRole(
        'menuitem',
        { name: 'Show Tasks Sidebar' },
      ),
    );
    expect(
      within(sidebar).getByRole('button', { name: 'Tasks' }),
    ).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(shell.getByRole('button', { name: 'Results' }));
    fireEvent.click(
      within(shell.getByRole('menu', { name: 'Results menu' })).getByRole(
        'menuitem',
        { name: 'Show Analysis Dock' },
      ),
    );
    expect(within(dock).getByRole('tab', { name: 'Analysis' }))
      .toHaveAttribute('aria-selected', 'true');

    fireEvent.click(shell.getByRole('button', { name: 'File' }));
    fireEvent.click(
      within(shell.getByRole('menu', { name: 'File menu' })).getByRole(
        'menuitem',
        { name: 'Show Export Dock' },
      ),
    );
    expect(within(dock).getByRole('tab', { name: 'Export' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows future calculation and settings commands as disabled placeholders', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);

    fireEvent.click(shell.getByRole('button', { name: 'Calculate' }));
    expect(
      within(shell.getByRole('menu', { name: 'Calculate menu' })).getByRole(
        'menuitem',
        { name: 'Gaussian Calculation...' },
      ),
    ).toBeDisabled();
    fireEvent.click(shell.getByRole('button', { name: 'Calculate' }));

    fireEvent.click(shell.getByRole('button', { name: 'Settings' }));
    expect(
      within(shell.getByRole('menu', { name: 'Settings menu' })).getByRole(
        'menuitem',
        { name: 'Server Settings...' },
      ),
    ).toBeDisabled();
  });

  it('defaults the primary sidebar to Explorer', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });

    expect(
      within(sidebar).getByRole('button', { name: 'Explorer' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(sidebar).getByRole('region', { name: 'Explorer sidebar panel' }),
    ).toHaveTextContent('Project and document navigation will appear here.');
  });

  it('switches primary sidebar views', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Tasks' }));

    expect(
      within(sidebar).getByRole('button', { name: 'Explorer' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(sidebar).getByRole('button', { name: 'Tasks' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(sidebar).getByRole('region', { name: 'Tasks sidebar panel' }),
    ).toHaveTextContent('CHEMSMART task catalog shortcuts will appear here.');

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Display' }));

    expect(
      within(sidebar).getByRole('button', { name: 'Tasks' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(sidebar).getByRole('button', { name: 'Display' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(sidebar).getByRole('region', { name: 'Display sidebar panel' }),
    ).toHaveTextContent(
      'Viewer display and representation controls will appear here.',
    );
  });

  it('renders a dedicated workspace slot before legacy content', () => {
    const { container } = render(
      <AppShell workspace={<p>Molecular viewer</p>}>
        <p>Legacy controls</p>
      </AppShell>,
    );
    const shell = within(container);
    const workspace = shell.getByRole('main', { name: 'Active workspace' });
    const viewerSlot = within(workspace).getByRole('region', {
      name: 'Molecular viewer workspace',
    });
    const legacyContent = within(workspace).getByRole('region', {
      name: 'Legacy workspace content',
    });

    expect(viewerSlot).toHaveClass('workbench-viewer-slot');
    expect(within(viewerSlot).getByText('Molecular viewer')).toBeInTheDocument();
    expect(legacyContent).toHaveClass('workbench-legacy-content');
    expect(
      within(legacyContent).getByText('Legacy controls'),
    ).toBeInTheDocument();
  });

  it('omits legacy workspace content when no legacy children are provided', () => {
    const { container } = render(
      <AppShell workspace={<p>Molecular viewer</p>} />,
    );
    const shell = within(container);
    const workspace = shell.getByRole('main', { name: 'Active workspace' });

    expect(
      within(workspace).getByRole('region', {
        name: 'Molecular viewer workspace',
      }),
    ).toHaveTextContent('Molecular viewer');
    expect(
      within(workspace).queryByRole('region', {
        name: 'Legacy workspace content',
      }),
    ).not.toBeInTheDocument();
  });

  it('defaults the bottom dock and right panel to their first tabs', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(dock).getByRole('tab', { name: 'Properties' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(dock).getByRole('tabpanel', { name: 'Properties' }),
    ).toHaveTextContent('Document and selection properties will appear here.');
    expect(
      within(rightPanel).getByRole('tab', { name: 'Details' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(rightPanel).getByRole('tabpanel', { name: 'Details' }),
    ).toHaveTextContent('Contextual analysis details will appear here.');
  });

  it('switches bottom dock tabs and omits unfinished tabs', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const dock = shell.getByRole('region', { name: 'Workbench dock' });

    fireEvent.click(within(dock).getByRole('tab', { name: 'Export' }));
    expect(
      within(dock).getByRole('tab', { name: 'Properties' }),
    ).toHaveAttribute('aria-selected', 'false');
    expect(within(dock).getByRole('tab', { name: 'Export' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      within(dock).getByRole('tabpanel', { name: 'Export' }),
    ).toHaveTextContent('Export previews and save actions will appear here.');

    fireEvent.click(within(dock).getByRole('tab', { name: 'Analysis' }));
    expect(within(dock).getByRole('tab', { name: 'Analysis' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      within(dock).getByRole('tabpanel', { name: 'Analysis' }),
    ).toHaveTextContent(
      'Frequency, trajectory, and spectrum panels will appear here.',
    );

    expect(
      within(dock).queryByRole('tab', { name: 'Logs' }),
    ).not.toBeInTheDocument();
    expect(
      shell.queryByRole('tab', { name: 'Inspector' }),
    ).not.toBeInTheDocument();
  });

  it('renders custom bottom dock and right panel slot content', () => {
    const { container } = render(
      <AppShell
        bottomDock={<p>Custom dock content</p>}
        rightPanel={<p>Custom right panel content</p>}
      >
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(dock).getByRole('region', { name: 'Custom bottom dock content' }),
    ).toHaveTextContent('Custom dock content');
    expect(
      within(rightPanel).getByRole('region', {
        name: 'Custom right panel content',
      }),
    ).toHaveTextContent('Custom right panel content');
    expect(
      within(dock).queryByRole('tablist', { name: 'Workbench dock tabs' }),
    ).not.toBeInTheDocument();
    expect(
      within(rightPanel).queryByRole('tablist', {
        name: 'Context panel tabs',
      }),
    ).not.toBeInTheDocument();
  });

  it('renders custom primary sidebar view content', () => {
    const { container } = render(
      <AppShell
        sidebarPanels={{
          explorer: <p>Open document controls</p>,
          display: <p>Viewer display controls</p>,
        }}
      >
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });

    expect(
      within(sidebar).getByRole('region', { name: 'Explorer sidebar panel' }),
    ).toHaveTextContent('Open document controls');
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Tasks' }));
    expect(
      within(sidebar).getByRole('region', { name: 'Tasks sidebar panel' }),
    ).toHaveTextContent('CHEMSMART task catalog shortcuts will appear here.');
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Display' }));
    expect(
      within(sidebar).getByRole('region', { name: 'Display sidebar panel' }),
    ).toHaveTextContent('Viewer display controls');
  });

  it('renders custom bottom dock and right panel tab content', () => {
    const { container } = render(
      <AppShell
        bottomDockPanels={{ properties: <p>Document properties</p> }}
        rightPanelPanels={{ details: <p>Selection details</p> }}
      >
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(dock).getByRole('tabpanel', { name: 'Properties' }),
    ).toHaveTextContent('Document properties');
    expect(
      within(rightPanel).getByRole('tabpanel', { name: 'Details' }),
    ).toHaveTextContent('Selection details');

    fireEvent.click(within(dock).getByRole('tab', { name: 'Export' }));
    expect(
      within(dock).getByRole('tabpanel', { name: 'Export' }),
    ).toHaveTextContent('Export previews and save actions will appear here.');
    expect(
      within(rightPanel).getByRole('tabpanel', { name: 'Details' }),
    ).toHaveTextContent('Selection details');
  });

  it('persists workbench tab selections', async () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Display' }));
    fireEvent.click(within(dock).getByRole('tab', { name: 'Analysis' }));
    await waitFor(() => {
      expect(readStoredLayoutPreferences()).toEqual({
        bottomDockTab: 'analysis',
        rightPanelTab: 'details',
        sidebarView: 'display',
      });
    });
  });

  it('restores persisted workbench tab selections', () => {
    window.localStorage.setItem(
      WORKBENCH_LAYOUT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        bottomDockTab: 'export',
        rightPanelTab: 'inspector',
        sidebarView: 'display',
      }),
    );

    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(sidebar).getByRole('button', { name: 'Display' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(dock).getByRole('tab', { name: 'Export' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      within(rightPanel).getByRole('tab', { name: 'Details' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to default workbench selections for invalid persisted data', () => {
    window.localStorage.setItem(
      WORKBENCH_LAYOUT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        bottomDockTab: 'missing',
        rightPanelTab: 'unknown',
        sidebarView: 'ghost',
      }),
    );

    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(sidebar).getByRole('button', { name: 'Explorer' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(dock).getByRole('tab', { name: 'Properties' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(rightPanel).getByRole('tab', { name: 'Details' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to default workbench selections for malformed persisted data', () => {
    window.localStorage.setItem(
      WORKBENCH_LAYOUT_PREFERENCES_STORAGE_KEY,
      '{not valid json',
    );

    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      within(sidebar).getByRole('button', { name: 'Explorer' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(dock).getByRole('tab', { name: 'Properties' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(rightPanel).getByRole('tab', { name: 'Details' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps rendering when workbench preference storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );
    const shell = within(container);
    const sidebar = shell.getByRole('complementary', {
      name: 'Primary workspace navigation',
    });
    const dock = shell.getByRole('region', { name: 'Workbench dock' });
    const rightPanel = shell.getByRole('complementary', {
      name: 'Context panel',
    });

    expect(
      shell.getByRole('heading', { name: 'CHEMSMART GUI' }),
    ).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Tasks' }));
    fireEvent.click(within(dock).getByRole('tab', { name: 'Analysis' }));

    expect(
      within(sidebar).getByRole('button', { name: 'Tasks' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(dock).getByRole('tab', { name: 'Analysis' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      within(rightPanel).getByRole('tab', { name: 'Details' }),
    ).toHaveAttribute('aria-selected', 'true');
  });
});

function readStoredLayoutPreferences(): Record<string, string> {
  const storedPreferences = window.localStorage.getItem(
    WORKBENCH_LAYOUT_PREFERENCES_STORAGE_KEY,
  );

  expect(storedPreferences).not.toBeNull();

  return JSON.parse(storedPreferences ?? '{}') as Record<string, string>;
}
