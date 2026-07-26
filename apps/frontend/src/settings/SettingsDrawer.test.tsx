import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsDrawer } from './SettingsDrawer';

function SettingsDrawerHarness(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">
        Open Settings
      </button>
      <SettingsDrawer
        activeSection="project"
        isOpen={isOpen}
        onActiveSectionChange={vi.fn()}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

describe('SettingsDrawer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows draft project settings with disabled persistence actions', () => {
    const onActiveSectionChange = vi.fn();
    const onClose = vi.fn();

    render(
      <SettingsDrawer
        activeSection="project"
        isOpen
        onActiveSectionChange={onActiveSectionChange}
        onClose={onClose}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Workbench Settings' });
    expect(
      within(drawer).getByRole('heading', { name: 'Project Settings' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('Preview')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Program')).toHaveValue('gaussian');
    expect(within(drawer).getByLabelText('File type')).toHaveValue('com');
    expect(within(drawer).getByLabelText('Method')).toHaveValue('B3LYP');
    expect(within(drawer).getByLabelText('Basis')).toHaveValue('def2-SVP');
    expect(within(drawer).getByLabelText('Job type')).toHaveValue('opt');
    expect(within(drawer).getByLabelText('Charge')).toHaveValue(0);
    expect(within(drawer).getByLabelText('Multiplicity')).toHaveValue(1);
    expect(within(drawer).getByLabelText('Execution mode'))
      .toHaveValue('run');
    expect(within(drawer).getByLabelText('Route')).toHaveValue(
      '# opt freq b3lyp/def2svp',
    );
    expect(within(drawer).getByLabelText('Program')).toBeDisabled();
    expect(
      within(drawer).getByRole('button', { name: 'Save Project Settings' }),
    ).toBeDisabled();
  });

  it('requests section changes and closes from Escape', () => {
    const onActiveSectionChange = vi.fn();
    const onClose = vi.fn();

    render(
      <SettingsDrawer
        activeSection="server"
        isOpen
        onActiveSectionChange={onActiveSectionChange}
        onClose={onClose}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Workbench Settings' });
    expect(
      within(drawer).getByRole('heading', { name: 'Server Settings' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Host'))
      .toHaveValue('login.example.edu');
    expect(within(drawer).getByLabelText('Scheduler')).toHaveValue('slurm');
    expect(within(drawer).getByLabelText('Queue / partition'))
      .toHaveValue('compute');
    expect(within(drawer).getByLabelText('Cores')).toHaveValue(16);
    expect(within(drawer).getByLabelText('Memory')).toHaveValue('32GB');
    expect(within(drawer).getByLabelText('Walltime')).toHaveValue('24:00:00');
    expect(within(drawer).getByLabelText('Remote workdir'))
      .toHaveValue('/scratch/$USER/chemsmart');
    expect(
      within(drawer).getByRole('button', { name: 'Test Connection' }),
    ).toBeDisabled();

    fireEvent.click(
      within(drawer).getByRole('button', { name: 'Project Settings' }),
    );
    expect(onActiveSectionChange).toHaveBeenCalledWith('project');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is pressed', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsDrawer
        activeSection="project"
        isOpen
        onActiveSectionChange={vi.fn()}
        onClose={onClose}
      />,
    );
    const backdrop = container.querySelector(
      '.workbench-settings-drawer-backdrop',
    );
    if (!(backdrop instanceof HTMLElement)) {
      throw new Error('Expected settings drawer backdrop.');
    }

    fireEvent.pointerDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus and restores it after closing', () => {
    render(<SettingsDrawerHarness />);

    const openButton = screen.getByRole('button', { name: 'Open Settings' });
    openButton.focus();
    fireEvent.click(openButton);

    const drawer = screen.getByRole('dialog', { name: 'Workbench Settings' });
    const closeButton = within(drawer).getByRole('button', { name: 'Close' });
    const serverSettingsButton = within(drawer).getByRole('button', {
      name: 'Server Settings',
    });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(serverSettingsButton).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Workbench Settings' }))
      .not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('does not render when closed', () => {
    render(
      <SettingsDrawer
        activeSection="project"
        isOpen={false}
        onActiveSectionChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('dialog', { name: 'Workbench Settings' }),
    ).not.toBeInTheDocument();
  });
});
