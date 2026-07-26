import { useEffect, useRef } from 'react';

export type SettingsDrawerSection = 'project' | 'server';

interface SettingsDrawerProps {
  activeSection: SettingsDrawerSection;
  isOpen: boolean;
  onActiveSectionChange: (section: SettingsDrawerSection) => void;
  onClose: () => void;
}

const SETTINGS_SECTIONS: ReadonlyArray<{
  id: SettingsDrawerSection;
  label: string;
}> = [
  { id: 'project', label: 'Project Settings' },
  { id: 'server', label: 'Server Settings' },
];

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
        'textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function SettingsDrawer({
  activeSection,
  isOpen,
  onActiveSectionChange,
  onClose,
}: SettingsDrawerProps): JSX.Element | null {
  const drawerRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const [firstFocusableElement] = focusableElements(drawerRef.current);
    (firstFocusableElement ?? drawerRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements(drawerRef.current);
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (!firstElement || !lastElement) {
        event.preventDefault();
        drawerRef.current?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="workbench-settings-drawer-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        aria-labelledby="workbench-settings-drawer-heading"
        aria-modal="true"
        className="workbench-settings-drawer"
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="workbench-settings-drawer-header">
          <div>
            <div className="workbench-heading-row">
              <h2 id="workbench-settings-drawer-heading">
                Workbench Settings
              </h2>
              <span className="workbench-preview-badge">Preview</span>
            </div>
            <p>
              Review the planned project and server configuration fields.
              Preview values are read-only and are not saved yet.
            </p>
          </div>
          <button
            className="workbench-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <nav
          aria-label="Settings sections"
          className="workbench-settings-drawer-tabs"
        >
          {SETTINGS_SECTIONS.map((section) => (
            <button
              aria-pressed={activeSection === section.id}
              className="workbench-panel-tab"
              key={section.id}
              onClick={() => onActiveSectionChange(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>

        {activeSection === 'project' ? (
          <ProjectSettingsSection />
        ) : (
          <ServerSettingsSection />
        )}
      </aside>
    </div>
  );
}

function ProjectSettingsSection(): JSX.Element {
  return (
    <section
      aria-labelledby="project-settings-heading"
      className="workbench-settings-drawer-section"
    >
      <div className="workbench-panel-heading">
        <h3 id="project-settings-heading">Project Settings</h3>
        <p>
          Shape the job snapshot CHEMSMART will eventually pass to its project
          settings and job settings services.
        </p>
      </div>

      <fieldset className="workbench-settings-form" disabled>
        <legend className="workbench-visually-hidden">
          Project settings preview fields
        </legend>
        <label className="workbench-field">
          <span className="workbench-field-label">Project name</span>
          <input
            className="workbench-input"
            defaultValue="default"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Program</span>
          <select className="workbench-input" defaultValue="gaussian">
            <option value="gaussian">gaussian</option>
            <option value="orca">orca</option>
          </select>
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">File type</span>
          <select className="workbench-input" defaultValue="com">
            <option value="com">com</option>
            <option value="gjf">gjf</option>
            <option value="inp">inp</option>
          </select>
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Method</span>
          <input
            className="workbench-input"
            defaultValue="B3LYP"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Basis</span>
          <input
            className="workbench-input"
            defaultValue="def2-SVP"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Job type</span>
          <select className="workbench-input" defaultValue="opt">
            <option value="opt">opt</option>
            <option value="freq">freq</option>
            <option value="sp">sp</option>
            <option value="irc">irc</option>
          </select>
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Charge</span>
          <input className="workbench-input" defaultValue="0" type="number" />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Multiplicity</span>
          <input className="workbench-input" defaultValue="1" type="number" />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Execution mode</span>
          <select className="workbench-input" defaultValue="run">
            <option value="run">run locally</option>
            <option value="sub">sub to cluster</option>
          </select>
        </label>
        <label className="workbench-field workbench-field-wide">
          <span className="workbench-field-label">Route</span>
          <textarea
            className="workbench-input"
            defaultValue="# opt freq b3lyp/def2svp"
            rows={3}
          />
        </label>
      </fieldset>

      <div className="workbench-settings-drawer-actions">
        <button className="workbench-button" disabled type="button">
          Load Project
        </button>
        <button
          className="workbench-button workbench-button-primary"
          disabled
          type="button"
        >
          Save Project Settings
        </button>
      </div>
      <p className="workbench-placeholder">
        Preview only. Project settings become editable when the CHEMSMART
        settings service is connected.
      </p>
    </section>
  );
}

function ServerSettingsSection(): JSX.Element {
  return (
    <section
      aria-labelledby="server-settings-heading"
      className="workbench-settings-drawer-section"
    >
      <div className="workbench-panel-heading">
        <h3 id="server-settings-heading">Server Settings</h3>
        <p>
          Prepare the HPC profile shape for future run/sub execution without
          storing credentials or testing network connections.
        </p>
      </div>

      <fieldset className="workbench-settings-form" disabled>
        <legend className="workbench-visually-hidden">
          Server settings preview fields
        </legend>
        <label className="workbench-field">
          <span className="workbench-field-label">Server profile</span>
          <input
            className="workbench-input"
            defaultValue="local-hpc"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Host</span>
          <input
            className="workbench-input"
            defaultValue="login.example.edu"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Scheduler</span>
          <select className="workbench-input" defaultValue="slurm">
            <option value="slurm">Slurm</option>
            <option value="pbs">PBS</option>
            <option value="lsf">LSF</option>
            <option value="local">Local</option>
          </select>
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Queue / partition</span>
          <input
            className="workbench-input"
            defaultValue="compute"
            type="text"
          />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Cores</span>
          <input className="workbench-input" defaultValue="16" type="number" />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Memory</span>
          <input className="workbench-input" defaultValue="32GB" type="text" />
        </label>
        <label className="workbench-field">
          <span className="workbench-field-label">Walltime</span>
          <input
            className="workbench-input"
            defaultValue="24:00:00"
            type="text"
          />
        </label>
        <label className="workbench-field workbench-field-wide">
          <span className="workbench-field-label">Remote workdir</span>
          <input
            className="workbench-input"
            defaultValue="/scratch/$USER/chemsmart"
            type="text"
          />
        </label>
      </fieldset>

      <div className="workbench-settings-drawer-actions">
        <button className="workbench-button" disabled type="button">
          Test Connection
        </button>
        <button
          className="workbench-button workbench-button-primary"
          disabled
          type="button"
        >
          Save Server Settings
        </button>
      </div>
      <p className="workbench-placeholder">
        Preview only. Connection tests and server profiles become editable
        after the CHEMSMART settings service is available.
      </p>
    </section>
  );
}
