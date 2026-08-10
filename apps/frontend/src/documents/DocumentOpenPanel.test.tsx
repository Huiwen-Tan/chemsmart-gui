import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentOpenPanel } from './DocumentOpenPanel';

describe('DocumentOpenPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows a system file chooser action and supported document hints', () => {
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        error={null}
        isOpeningDocument={false}
        onChooseDocument={vi.fn()}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Open Document' });
    expect(within(panel).getByText('Connected')).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Choose File...' }),
    ).toBeEnabled();
    expect(
      within(panel).getByText('Choose a local molecular document to open.'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { name: 'Supported Documents' }),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/xTB \.out/)).toBeInTheDocument();
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('requests the system file chooser', () => {
    const onChooseDocument = vi.fn();
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        error={null}
        isOpeningDocument={false}
        onChooseDocument={onChooseDocument}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose File...' }));

    expect(onChooseDocument).toHaveBeenCalledOnce();
  });

  it('shows a successful document-open summary', () => {
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        documentOpenStatus="Opened water.xyz · 3 atoms"
        error={null}
        isOpeningDocument={false}
        onChooseDocument={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Opened water.xyz · 3 atoms',
    );
  });

  it('shows opening state and disables the chooser', () => {
    render(
      <DocumentOpenPanel
        backendHealthStatus="ok"
        error="Backend unavailable"
        isOpeningDocument
        onChooseDocument={vi.fn()}
        openingDocumentName="water.out"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Opening water.out...');
    expect(screen.getByRole('button', { name: 'Choose File...' }))
      .toBeDisabled();
    expect(screen.getByText('Error: Backend unavailable')).toBeInTheDocument();
  });
});
