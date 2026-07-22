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
    size_bytes: 86,
    modified_time_ns: 123456789,
  },
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [],
  bonds: [],
  frozen_atom_indices: [],
};

const GAUSSIAN_OUTPUT_DOCUMENT: MoleculeDocument = {
  ...WATER_DOCUMENT,
  id: 'water-log',
  source: {
    path: 'sample-data/water.log',
    filename: 'water.log',
    filetype: 'log',
  },
  calculation: {
    program: 'gaussian',
    normal_termination: true,
  },
};

const INCOMPLETE_OUTPUT_DOCUMENT: MoleculeDocument = {
  ...GAUSSIAN_OUTPUT_DOCUMENT,
  id: 'incomplete-water-log',
  calculation: {
    program: 'gaussian',
    normal_termination: false,
  },
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
    expect(within(panel).getByText('Source size')).toBeInTheDocument();
    expect(within(panel).getByText('86 bytes')).toBeInTheDocument();
    expect(
      within(panel).getByText('Source modified timestamp'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('123456789 ns')).toBeInTheDocument();
    expect(within(panel).getByText('Calculation program')).toBeInTheDocument();
    expect(within(panel).getByText('normal_termination')).toBeInTheDocument();
    expect(within(panel).getByText('Calculation state')).toBeInTheDocument();
    expect(within(panel).getByText('Molecule edit state')).toBeInTheDocument();
    expect(within(panel).getByText('No unsaved edits')).toBeInTheDocument();
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(3);
  });

  it('shows unsaved molecule edit state for edited documents', () => {
    render(
      <DocumentSummaryPanel
        document={WATER_DOCUMENT}
        hasUnsavedMoleculeEdits
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('Unsaved edits')).toBeInTheDocument();
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
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(8);
  });

  it('shows unavailable source revision when source lacks file metadata', () => {
    render(
      <DocumentSummaryPanel
        document={{
          ...WATER_DOCUMENT,
          source: {
            path: 'sample-data/water.xyz',
            filename: 'water.xyz',
            filetype: 'xyz',
            size_bytes: null,
            modified_time_ns: null,
          },
        }}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getAllByText('Unavailable')).toHaveLength(5);
  });

  it('shows calculation metadata for output documents', () => {
    render(<DocumentSummaryPanel document={GAUSSIAN_OUTPUT_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('water.log')).toBeInTheDocument();
    expect(within(panel).getByText('gaussian')).toBeInTheDocument();
    expect(within(panel).getByText('true')).toBeInTheDocument();
    expect(within(panel).getByText('Normal termination')).toBeInTheDocument();
  });

  it('shows incomplete or failed state for non-normal termination', () => {
    render(<DocumentSummaryPanel document={INCOMPLETE_OUTPUT_DOCUMENT} />);

    const panel = screen.getByRole('region', { name: 'Current Document' });
    expect(within(panel).getByText('false')).toBeInTheDocument();
    expect(within(panel).getByText('Incomplete or failed')).toBeInTheDocument();
  });
});
