import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchDialog } from './WorkbenchDialog';

describe('WorkbenchDialog', () => {
  it('focuses its close button and restores the previous focus on close', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open Results</button>
        <WorkbenchDialog
          isOpen={false}
          onClose={onClose}
          title="Vibrations"
        >
          <p>Mode table</p>
        </WorkbenchDialog>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Open Results' });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open Results</button>
        <WorkbenchDialog isOpen onClose={onClose} title="Vibrations">
          <p>Mode table</p>
        </WorkbenchDialog>
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Vibrations' });
    expect(
      within(dialog).getByRole('button', { name: 'Close Vibrations' }),
    ).toHaveFocus();

    rerender(
      <>
        <button type="button">Open Results</button>
        <WorkbenchDialog
          isOpen={false}
          onClose={onClose}
          title="Vibrations"
        >
          <p>Mode table</p>
        </WorkbenchDialog>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Open Results' })).toHaveFocus();
  });

  it('requests close from Escape and backdrop interaction', () => {
    const onClose = vi.fn();
    const { container } = render(
      <WorkbenchDialog isOpen onClose={onClose} title="IR Spectrum">
        <p>Spectrum chart</p>
      </WorkbenchDialog>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = container.querySelector('.workbench-dialog-backdrop');
    if (!(backdrop instanceof HTMLElement)) {
      throw new Error('Expected Workbench dialog backdrop.');
    }
    fireEvent.pointerDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
