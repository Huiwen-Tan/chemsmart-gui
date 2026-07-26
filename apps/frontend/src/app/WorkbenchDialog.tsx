import { useEffect, useId, useRef, type ReactNode } from 'react';

interface WorkbenchDialogProps {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export function WorkbenchDialog({
  children,
  description,
  isOpen,
  onClose,
  title,
}: WorkbenchDialogProps): JSX.Element | null {
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusableSelector =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
      'textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    focusableElements[0]?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusableElements.length === 0) {
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements.at(-1);
      if (
        event.shiftKey &&
        document.activeElement === firstFocusableElement
      ) {
        event.preventDefault();
        lastFocusableElement?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastFocusableElement
      ) {
        event.preventDefault();
        firstFocusableElement?.focus();
      }
    };

    window.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.removeEventListener('keydown', handleDialogKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="workbench-dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="workbench-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header className="workbench-dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            aria-label={`Close ${title}`}
            className="workbench-dialog-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="workbench-dialog-body">{children}</div>
      </section>
    </div>
  );
}
