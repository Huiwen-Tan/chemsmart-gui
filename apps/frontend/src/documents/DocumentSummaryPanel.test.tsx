import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { DocumentSummaryPanel } from './DocumentSummaryPanel';

const WATER_DOCUMENT: MoleculeDocument = {
  id: 'water',
  name: 'str-H2O-102b86d02472',
  document_kind: 'structure',
  source: {
    path: 'sample-data/water.xyz',
    filename: 'water.xyz',
    filetype: 'xyz',
  },
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [],
  bonds: [],
};

describe('DocumentSummaryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows an empty state when no document is loaded', () => {
    render(<DocumentSummaryPanel document={null} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('No document loaded.')).toBeInTheDocument();
  });

  it('shows document kind and source metadata for a loaded document', () => {
    render(<DocumentSummaryPanel document={WATER_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('str-H2O-102b86d02472')).toBeInTheDocument();
    expect(within(panel).getByText('structure')).toBeInTheDocument();
    expect(within(panel).getByText('water.xyz')).toBeInTheDocument();
    expect(within(panel).getByText('xyz')).toBeInTheDocument();
    expect(
      within(panel).getByText('sample-data/water.xyz'),
    ).toBeInTheDocument();
  });

  it('shows unavailable source fields without inventing metadata', () => {
    render(
      <DocumentSummaryPanel
        document={{
          ...WATER_DOCUMENT,
          source: null,
        }}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(3);
  });
});
