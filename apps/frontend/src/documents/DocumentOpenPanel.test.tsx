import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentOpenPanel } from './DocumentOpenPanel';

describe('DocumentOpenPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows path entry, status, and supported document hints', () => {
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        documentPath="sample-data/water.xyz"
        error={null}
        isOpeningDocument={false}
        onDocumentOpen={vi.fn()}
        onDocumentPathChange={vi.fn()}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Open Document' });
    expect(within(panel).getByLabelText('Document path'))
      .toHaveValue('sample-data/water.xyz');
    expect(within(panel).getByText('Backend health:')).toBeInTheDocument();
    expect(
      within(panel).getByText('Ready to open a local document path.'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { name: 'Supported Documents' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Gaussian \.com\/\.gjf and ORCA \.inp/),
    ).toBeInTheDocument();
  });

  it('requests document opens from the form', () => {
    const onDocumentOpen = vi.fn();
    const onDocumentPathChange = vi.fn();

    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        documentPath="sample-data/water.xyz"
        error={null}
        isOpeningDocument={false}
        onDocumentOpen={onDocumentOpen}
        onDocumentPathChange={onDocumentPathChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Document path'), {
      target: { value: 'sample-data/water.log' },
    });
    expect(onDocumentPathChange).toHaveBeenCalledWith('sample-data/water.log');

    fireEvent.click(screen.getByRole('button', { name: 'Open Document' }));
    expect(onDocumentOpen).toHaveBeenCalledWith();
  });

  it('shows opening state and disables open controls', () => {
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        documentPath="sample-data/water.out"
        error="Backend unavailable"
        isOpeningDocument
        onDocumentOpen={vi.fn()}
        onDocumentPathChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Opening sample-data/water.out...',
    );
    expect(screen.getByRole('button', { name: 'Open Document' }))
      .toBeDisabled();
    expect(screen.getByText('Error: Backend unavailable')).toBeInTheDocument();
  });
});
