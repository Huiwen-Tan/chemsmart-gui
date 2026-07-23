import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders its title and child content', () => {
    render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );

    expect(
      screen.getByRole('heading', { name: 'CHEMSMART GUI' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Workspace content')).toBeInTheDocument();
  });

  it('uses the workbench token classes', () => {
    const { container } = render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );

    expect(container.querySelector('main')).toHaveClass('workbench-root');
    expect(container.querySelector('h1')).toHaveClass('workbench-title');
  });
});
