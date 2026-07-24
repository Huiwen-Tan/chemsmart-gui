import { useMemo, useState } from 'react';

type TaskCatalogStatus = 'planned' | 'blocked';

interface TaskCatalogItem {
  description: string;
  disabledReason: string;
  id: string;
  inputs: readonly string[];
  label: string;
  output: string;
  status: TaskCatalogStatus;
}

interface TaskCatalogGroup {
  description: string;
  id: string;
  label: string;
  tasks: readonly TaskCatalogItem[];
}

const TASK_CATALOG_GROUPS: readonly TaskCatalogGroup[] = [
  {
    id: 'calculation-setup',
    label: 'Calculation Setup',
    description: 'Prepare CHEMSMART jobs for local or HPC execution.',
    tasks: [
      {
        id: 'gaussian-calculation',
        label: 'Gaussian Calculation',
        description:
          'Build a Gaussian job from the current molecule, charge, multiplicity, method, basis, and jobtype.',
        disabledReason:
          'Project settings, server settings, and job writer preview are not connected yet.',
        inputs: ['Molecule', 'method', 'basis', 'jobtype', 'route_string'],
        output: 'Gaussian .com preview and run/sub job plan',
        status: 'planned',
      },
      {
        id: 'orca-calculation',
        label: 'ORCA Calculation',
        description:
          'Build an ORCA job with the same project/job snapshot vocabulary used by CHEMSMART.',
        disabledReason:
          'ORCA job settings and input preview are not connected yet.',
        inputs: ['Molecule', 'method', 'basis', 'jobtype', 'charge'],
        output: 'ORCA .inp preview and run/sub job plan',
        status: 'planned',
      },
      {
        id: 'batch-job-submission',
        label: 'Batch Job Submission',
        description:
          'Prepare multiple molecules or conformers for CHEMSMART batch run/sub workflows.',
        disabledReason:
          'Batch source selection and runner integration are not connected yet.',
        inputs: ['Molecule set', 'program', 'project', 'server'],
        output: 'Batch job queue preview',
        status: 'planned',
      },
    ],
  },
  {
    id: 'analysis-workflows',
    label: 'Analysis Workflows',
    description: 'Inspect parsed results that CHEMSMART already computed.',
    tasks: [
      {
        id: 'thermochemistry-analysis',
        label: 'Thermochemistry Analysis',
        description:
          'Review thermochemistry from parsed frequency jobs without recomputing frontend chemistry.',
        disabledReason:
          'Thermochemistry service responses are not wired into this catalog yet.',
        inputs: ['Frequency output', 'normal_termination', 'temperature'],
        output: 'Thermochemistry table and export preview',
        status: 'planned',
      },
      {
        id: 'vibrational-results',
        label: 'Vibrational Results',
        description:
          'Open vibrational modes, IR spectrum, and broadened spectrum views for supported results.',
        disabledReason:
          'Result routing from the catalog is not connected yet.',
        inputs: ['Parsed modes', 'IR intensities', 'frequency_cm_minus_1'],
        output: 'Mode table, animation, and spectrum panel',
        status: 'planned',
      },
      {
        id: 'irc-trajectory-review',
        label: 'IRC and Trajectory Review',
        description:
          'Browse IRC paths, optimization trajectories, and trajectory properties from parsed documents.',
        disabledReason:
          'Trajectory routing from the catalog is not connected yet.',
        inputs: ['Trajectory document', 'frame_properties', 'energy_hartree'],
        output: 'Trajectory viewer and energy profile',
        status: 'planned',
      },
    ],
  },
  {
    id: 'database-workflows',
    label: 'Database Workflows',
    description: 'Assemble, inspect, export, and restart from CHEMSMART records.',
    tasks: [
      {
        id: 'assemble-database',
        label: 'Assemble Calculation Database',
        description:
          'Assemble completed calculations into CHEMSMART database records with provenance.',
        disabledReason:
          'Database selection and assembler service integration are not connected yet.',
        inputs: ['Calculation folders', 'program', 'filetype'],
        output: 'Records with record_id, molecules, results, and provenance',
        status: 'planned',
      },
      {
        id: 'restart-from-record',
        label: 'Restart From Database Entry',
        description:
          'Prepare a new calculation from a selected record, structure, molecule, or trajectory entry.',
        disabledReason:
          'Database browser and restart writer are not connected yet.',
        inputs: ['record_id', 'structure_id', 'molecule_id', 'trajectory_id'],
        output: 'Restart job preview',
        status: 'planned',
      },
      {
        id: 'export-records',
        label: 'Export Database Records',
        description:
          'Export selected CHEMSMART records with the same keys as database JSON export.',
        disabledReason:
          'Database exporter service integration is not connected yet.',
        inputs: ['record_id filters', 'program', 'normal_termination'],
        output: 'CSV or JSON export preview',
        status: 'planned',
      },
    ],
  },
  {
    id: 'automation-workflows',
    label: 'Automation Workflows',
    description: 'Expose batch analysis, restart, and iterator workflows.',
    tasks: [
      {
        id: 'batch-thermochemistry',
        label: 'Batch Thermochemistry',
        description:
          'Collect thermochemistry across many completed jobs and prepare summary tables.',
        disabledReason:
          'Batch thermochemistry service integration is not connected yet.',
        inputs: ['Job folders', 'database records', 'temperature'],
        output: 'Batch thermochemistry summary',
        status: 'planned',
      },
      {
        id: 'iterator-workflow',
        label: 'Iterator Workflow',
        description:
          'Configure CHEMSMART iterator-style automation for repeated job generation.',
        disabledReason:
          'Iterator configuration UI is not connected yet.',
        inputs: ['Template job', 'iterator settings', 'project'],
        output: 'Iterator run plan',
        status: 'planned',
      },
      {
        id: 'batch-restart',
        label: 'Batch Restart',
        description:
          'Prepare restart jobs from failed or selected database entries in bulk.',
        disabledReason:
          'Batch restart source selection is not connected yet.',
        inputs: ['Database records', 'restart policy', 'server'],
        output: 'Batch restart queue preview',
        status: 'planned',
      },
    ],
  },
];

export function TaskCatalogPanel(): JSX.Element {
  const [selectedTaskId, setSelectedTaskId] = useState(
    TASK_CATALOG_GROUPS[0].tasks[0].id,
  );
  const selectedTask = useMemo(
    () => taskCatalogItems().find((task) => task.id === selectedTaskId),
    [selectedTaskId],
  ) ?? TASK_CATALOG_GROUPS[0].tasks[0];

  return (
    <section aria-labelledby="task-catalog-heading" className="workbench-task-catalog">
      <div className="workbench-panel-heading">
        <h2 id="task-catalog-heading">Task Catalog</h2>
        <p>
          Browse CHEMSMART workflows. These entries are placeholders until
          project settings, server settings, and service adapters are connected.
        </p>
      </div>
      <div className="workbench-task-catalog-groups">
        {TASK_CATALOG_GROUPS.map((group) => (
          <section
            aria-labelledby={`task-catalog-${group.id}-heading`}
            className="workbench-task-catalog-group"
            key={group.id}
          >
            <h3 id={`task-catalog-${group.id}-heading`}>{group.label}</h3>
            <p>{group.description}</p>
            <div className="workbench-task-catalog-list">
              {group.tasks.map((task) => (
                <button
                  aria-pressed={selectedTask.id === task.id}
                  className="workbench-task-catalog-item"
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  type="button"
                >
                  <span>{task.label}</span>
                  <span className="workbench-task-catalog-status">
                    {formatTaskStatus(task.status)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section
        aria-labelledby="task-catalog-selected-heading"
        className="workbench-task-catalog-detail"
      >
        <p className="workbench-region-label">Selected Task</p>
        <h3 id="task-catalog-selected-heading">{selectedTask.label}</h3>
        <p>{selectedTask.description}</p>
        <dl>
          <dt>Required inputs</dt>
          <dd>{selectedTask.inputs.join(', ')}</dd>
          <dt>Planned output</dt>
          <dd>{selectedTask.output}</dd>
          <dt>Status</dt>
          <dd>{formatTaskStatus(selectedTask.status)}</dd>
        </dl>
        <button className="workbench-button" disabled type="button">
          Configure Task
        </button>
        <p className="workbench-placeholder">{selectedTask.disabledReason}</p>
      </section>
    </section>
  );
}

function taskCatalogItems(): readonly TaskCatalogItem[] {
  return TASK_CATALOG_GROUPS.flatMap((group) => group.tasks);
}

function formatTaskStatus(status: TaskCatalogStatus): string {
  return status === 'planned' ? 'Planned' : 'Blocked';
}
