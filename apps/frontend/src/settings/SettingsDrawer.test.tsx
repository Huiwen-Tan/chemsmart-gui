import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsDrawer } from './SettingsDrawer';

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
    expect(within(drawer).getByLabelText('program')).toHaveValue('gaussian');
    expect(within(drawer).getByLabelText('filetype')).toHaveValue('com');
    expect(within(drawer).getByLabelText('method')).toHaveValue('B3LYP');
    expect(within(drawer).getByLabelText('basis')).toHaveValue('def2-SVP');
    expect(within(drawer).getByLabelText('jobtype')).toHaveValue('opt');
    expect(within(drawer).getByLabelText('charge')).toHaveValue(0);
    expect(within(drawer).getByLabelText('multiplicity')).toHaveValue(1);
    expect(within(drawer).getByLabelText('Execution mode'))
      .toHaveValue('run');
    expect(within(drawer).getByLabelText('route_string')).toHaveValue(
      '# opt freq b3lyp/def2svp',
    );
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
