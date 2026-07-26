import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TaskCatalogPanel } from './TaskCatalogPanel';

describe('TaskCatalogPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows grouped CHEMSMART task families without runnable actions', () => {
    render(<TaskCatalogPanel />);

    const catalog = screen.getByRole('region', { name: 'Task Catalog' });

    for (const groupName of [
      'Calculation Setup',
      'Analysis Workflows',
      'Database Workflows',
      'Automation Workflows',
    ]) {
      expect(
        within(catalog).getByRole('heading', { name: groupName }),
      ).toBeInTheDocument();
    }

    expect(
      within(catalog).getByRole('button', { name: /Gaussian Calculation/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(catalog).getByText(
      'Molecule, method, basis, Job type, Route options',
    )).toBeInTheDocument();
    expect(
      within(catalog).getByRole('button', { name: 'Configure Task' }),
    ).toBeDisabled();
  });

  it('updates the selected task detail when browsing the catalog', () => {
    render(<TaskCatalogPanel />);

    const catalog = screen.getByRole('region', { name: 'Task Catalog' });
    fireEvent.click(
      within(catalog).getByRole('button', {
        name: /Assemble Calculation Database/,
      }),
    );

    expect(
      within(catalog).getByRole('button', {
        name: /Assemble Calculation Database/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(catalog).getByRole('heading', {
      name: 'Assemble Calculation Database',
    })).toBeInTheDocument();
    expect(within(catalog).getByText('Calculation folders, program, File type'))
      .toBeInTheDocument();
    expect(
      within(catalog).getByText(
        'Records with IDs, molecules, results, and provenance',
      ),
    ).toBeInTheDocument();
  });
});
