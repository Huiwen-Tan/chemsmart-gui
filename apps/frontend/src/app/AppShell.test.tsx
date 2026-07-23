import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
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

    expect(shell.getByText('Explorer')).toBeInTheDocument();
    expect(shell.getByText('Context')).toBeInTheDocument();
    expect(shell.getByText('Dock')).toBeInTheDocument();
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
});
