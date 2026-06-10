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
});
