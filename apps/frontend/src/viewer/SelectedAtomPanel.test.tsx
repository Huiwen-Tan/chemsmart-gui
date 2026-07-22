import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoleculeDocument } from '../shared/types';
import { useDocumentStore } from '../state/useDocumentStore';
import { useViewerStore } from '../state/useViewerStore';
import { SelectedAtomPanel } from './SelectedAtomPanel';

const WATER: MoleculeDocument = {
  id: 'water',
  name: 'water',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'O', x: 0, y: 0, z: 0 },
    { index: 2, element: 'H', x: 0.76, y: 0.58, z: 0 },
    { index: 3, element: 'H', x: -0.76, y: 0.58, z: 0 },
  ],
  bonds: [
    { atom1: 1, atom2: 2 },
    { atom1: 1, atom2: 3 },
  ],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const WATER_WITH_EXTRA_ATOM: MoleculeDocument = {
  ...WATER,
  atoms: [
    ...WATER.atoms,
    { index: 4, element: 'H', x: 0, y: -0.58, z: 0 },
  ],
};

const FROZEN_WATER: MoleculeDocument = {
  ...WATER,
  frozen_atom_indices: [1, 3],
};

const DIHEDRAL_FRAGMENT: MoleculeDocument = {
  id: 'dihedral-fragment',
  name: 'dihedral-fragment',
  document_kind: 'structure',
  source: null,
  calculation: null,
  coordinate_unit: 'angstrom',
  charge: null,
  multiplicity: null,
  atoms: [
    { index: 1, element: 'C', x: 1, y: 0, z: 0 },
    { index: 2, element: 'C', x: 0, y: 0, z: 0 },
    { index: 3, element: 'C', x: 0, y: 1, z: 0 },
    { index: 4, element: 'H', x: 0, y: 1, z: 1 },
  ],
  bonds: [],
  frozen_atom_indices: [],
  vibrational_modes: [],
};

const DIHEDRAL_FRAGMENT_WITH_EXTRA_ATOM: MoleculeDocument = {
  ...DIHEDRAL_FRAGMENT,
  atoms: [
    ...DIHEDRAL_FRAGMENT.atoms,
    { index: 5, element: 'H', x: 0, y: 1, z: -1 },
  ],
};

const COLLINEAR_FRAGMENT: MoleculeDocument = {
  ...DIHEDRAL_FRAGMENT,
  id: 'collinear-fragment',
  name: 'collinear-fragment',
  atoms: [
    { index: 1, element: 'C', x: 0, y: 0, z: 0 },
    { index: 2, element: 'C', x: 1, y: 0, z: 0 },
    { index: 3, element: 'C', x: 2, y: 0, z: 0 },
    { index: 4, element: 'H', x: 3, y: 0, z: 0 },
  ],
};

const initialDocumentState = useDocumentStore.getState();

describe('SelectedAtomPanel', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      currentDocument: null,
      canUndoMoleculeEdit: false,
      canRedoMoleculeEdit: false,
      hasUnsavedMoleculeEdits: false,
      isApplyingMoleculeEdit: false,
      moleculeEditError: null,
      moleculeEditUndoStack: [],
      moleculeEditRedoStack: [],
      setCurrentDocument: initialDocumentState.setCurrentDocument,
      applyMoleculeEditCommand: initialDocumentState.applyMoleculeEditCommand,
    });
    useViewerStore.setState({ selectedAtomIndices: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows an explicit empty state without a valid selection', () => {
    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByText('Select an atom to inspect its metadata.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear Selection' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Add atom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Atom' })).toBeEnabled();
    expect(screen.getByText('Frozen atom indices: none')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Freeze Selected Atoms' }),
    ).toBeDisabled();
  });

  it('submits add atom edits through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('New atom element'), {
      target: { value: 'He' },
    });
    fireEvent.change(screen.getByLabelText('New atom X coordinate'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('New atom Y coordinate'), {
      target: { value: '1.1' },
    });
    fireEvent.change(screen.getByLabelText('New atom Z coordinate'), {
      target: { value: '1.2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Atom' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'add_atom',
      document_id: 'water',
      element: 'He',
      position: { x: 1, y: 1.1, z: 1.2 },
      coordinate_unit: 'angstrom',
    });
  });

  it.each([
    {
      field: 'New atom element',
      value: ' ',
      error: 'Atom element is required.',
    },
    {
      field: 'New atom X coordinate',
      value: 'not-a-number',
      error: 'Coordinates must be finite numbers.',
    },
  ])('shows a local error for invalid add atom field $field', ({
    error,
    field,
    value,
  }) => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText(field), {
      target: { value },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Atom' }));

    expect(screen.getByText(error)).toBeInTheDocument();
    expect(applyMoleculeEditCommand).not.toHaveBeenCalled();
  });

  it('clears selected atoms from the panel control', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 1] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByRole('button', { name: 'Clear Selection' }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Selection' }));

    expect(useViewerStore.getState().selectedAtomIndices).toEqual([]);
    expect(
      screen.getByText('Select an atom to inspect its metadata.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows frozen atom state for the current selection', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 2] });

    render(<SelectedAtomPanel document={FROZEN_WATER} />);

    expect(screen.getByText('Frozen atom indices: 1, 3')).toBeInTheDocument();
    expect(
      screen.getByText('Selected frozen atom indices: 3'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Selected unfrozen atom indices: 2'),
    ).toBeInTheDocument();
  });

  it('freezes selected atoms through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2, 99] });

    render(<SelectedAtomPanel document={FROZEN_WATER} />);

    expect(
      screen.getByRole('button', { name: 'Freeze Selected Atoms' }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Freeze Selected Atoms' }),
    );

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_frozen_atoms',
      document_id: 'water',
      atom_indices: [2],
      action: 'freeze',
    });
  });

  it('unfreezes selected atoms through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    render(<SelectedAtomPanel document={FROZEN_WATER} />);

    expect(
      screen.getByRole('button', { name: 'Unfreeze Selected Atoms' }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Unfreeze Selected Atoms' }),
    );

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_frozen_atoms',
      document_id: 'water',
      atom_indices: [1, 2],
      action: 'unfreeze',
    });
  });

  it('replaces and clears frozen atoms through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    render(<SelectedAtomPanel document={FROZEN_WATER} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Replace Frozen Atoms With Selection',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear Frozen Atoms' }));

    expect(applyMoleculeEditCommand).toHaveBeenNthCalledWith(1, {
      command_type: 'set_frozen_atoms',
      document_id: 'water',
      atom_indices: [2],
      action: 'replace',
    });
    expect(applyMoleculeEditCommand).toHaveBeenNthCalledWith(2, {
      command_type: 'set_frozen_atoms',
      document_id: 'water',
      atom_indices: [],
      action: 'replace',
    });
  });

  it('shows selected metadata and distance for two valid selected atoms', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 99, 1] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByText('Coordinates (angstrom)')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('3 H');
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['-0.760', '0.580', '0.000']);
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('1 O');
    expect(within(rows[2]).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['0.000', '0.000', '0.000']);
    expect(screen.getByText('Distance:')).toBeInTheDocument();
    expect(screen.getByText('3 H - 1 O = 0.956 angstrom')).toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([3, 99, 1]);
  });

  it('adds a bond between two selected atoms through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2, 3] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByRole('region', { name: 'Edit selected atom bond' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bond Between 2 H and 3 H'),
    ).toBeInTheDocument();
    expect(screen.getByText('Current bond: absent')).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Edit selected atom distance' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Bond' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remove Bond' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Add Bond' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'add_bond',
      document_id: 'water',
      atom1_index: 2,
      atom2_index: 3,
    });
  });

  it('sets the distance between two selected atoms', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    const distanceInput = screen.getByLabelText(
      'Selected atom distance',
    ) as HTMLInputElement;
    expect(Number(distanceInput.value)).toBeCloseTo(0.956, 3);

    fireEvent.change(distanceInput, {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Distance' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_atom_distance',
      document_id: 'water',
      atom1_index: 1,
      atom2_index: 2,
      distance: 1.5,
      coordinate_unit: 'angstrom',
    });
  });

  it('shows a local error for invalid distance edits', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('Selected atom distance'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Distance' }));

    expect(
      screen.getByText('Distance must be a positive number.'),
    ).toBeInTheDocument();
    expect(applyMoleculeEditCommand).not.toHaveBeenCalled();
  });

  it('removes an existing bond between two selected atoms', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2, 1] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByText('Current bond: present')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Bond' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Bond' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Bond' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'remove_bond',
      document_id: 'water',
      atom1_index: 2,
      atom2_index: 1,
    });
  });

  it('does not show bond editing controls outside a two-atom selection', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.queryByRole('region', { name: 'Edit selected atom bond' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('form', { name: 'Edit selected atom distance' }),
    ).not.toBeInTheDocument();
  });

  it('deletes selected atoms through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2, 99] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByRole('region', { name: 'Delete selected atoms' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Selected atom indices: 2')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Selected Atoms' }),
    );

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'delete_atoms',
      document_id: 'water',
      atom_indices: [2],
    });
  });

  it('disables selected atom deletion when every atom is selected', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByRole('button', { name: 'Delete Selected Atoms' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Cannot delete every atom from a molecule document.'),
    ).toBeInTheDocument();
  });

  it('shows coordinate inputs for one valid selected atom', () => {
    useViewerStore.setState({ selectedAtomIndices: [2] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByRole('form', {
        name: 'Edit selected atom coordinates',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('X coordinate')).toHaveDisplayValue('0.76');
    expect(screen.getByLabelText('Y coordinate')).toHaveDisplayValue('0.58');
    expect(screen.getByLabelText('Z coordinate')).toHaveDisplayValue('0');
    expect(
      screen.getByRole('button', { name: 'Apply Coordinates' }),
    ).toBeInTheDocument();
  });

  it('does not show coordinate inputs for multiple selected atoms', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.queryByRole('form', {
        name: 'Edit selected atom coordinates',
      }),
    ).not.toBeInTheDocument();
  });

  it('submits selected atom coordinate edits through the document store', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('X coordinate'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Y coordinate'), {
      target: { value: '1.1' },
    });
    fireEvent.change(screen.getByLabelText('Z coordinate'), {
      target: { value: '1.2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Coordinates' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_atom_position',
      document_id: 'water',
      atom_index: 2,
      position: { x: 1, y: 1.1, z: 1.2 },
      coordinate_unit: 'angstrom',
    });
  });

  it('shows a local error for invalid coordinate edits', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('X coordinate'), {
      target: { value: 'not-a-number' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Coordinates' }));

    expect(
      screen.getByText('Coordinates must be finite numbers.'),
    ).toBeInTheDocument();
    expect(applyMoleculeEditCommand).not.toHaveBeenCalled();
  });

  it('shows backend molecule edit errors from the document store', () => {
    useDocumentStore.setState({
      moleculeEditError: 'Atom index 99 was not found in document water.',
    });
    useViewerStore.setState({ selectedAtomIndices: [2] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(
      screen.getByText('Atom index 99 was not found in document water.'),
    ).toBeInTheDocument();
  });

  it('shows selected metadata and angle using the second atom as the vertex', () => {
    useViewerStore.setState({ selectedAtomIndices: [3, 99, 1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    expect(screen.getByText('Angle:')).toBeInTheDocument();
    expect(
      screen.getByText('3 H - 1 O - 2 H = 105.301 degrees'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Edit selected atom angle' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set Angle' }),
    ).toBeInTheDocument();
    const angleInput = screen.getByLabelText(
      'Selected atom angle',
    ) as HTMLInputElement;
    expect(Number(angleInput.value)).toBeCloseTo(105.301, 3);
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      3,
      99,
      1,
      2,
    ]);
  });

  it('sets the angle between three selected atoms', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [3, 1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('Selected atom angle'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Angle' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_atom_angle',
      document_id: 'water',
      atom1_index: 3,
      vertex_atom_index: 1,
      atom3_index: 2,
      angle_degrees: 120,
    });
  });

  it('shows a local error for invalid angle edits', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [3, 1, 2] });

    render(<SelectedAtomPanel document={WATER} />);

    fireEvent.change(screen.getByLabelText('Selected atom angle'), {
      target: { value: '180' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Angle' }));

    expect(
      screen.getByText(
        'Angle must be greater than 0 and less than 180 degrees.',
      ),
    ).toBeInTheDocument();
    expect(applyMoleculeEditCommand).not.toHaveBeenCalled();
  });

  it('shows selected metadata and dihedral in interaction order', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 99, 2, 3, 4] });

    render(<SelectedAtomPanel document={DIHEDRAL_FRAGMENT} />);

    expect(screen.getByText('Dihedral:')).toBeInTheDocument();
    expect(
      screen.getByText('1 C - 2 C - 3 C - 4 H = -90.000 degrees'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('form', { name: 'Edit selected atom dihedral' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set Dihedral' }),
    ).toBeInTheDocument();
    const dihedralInput = screen.getByLabelText(
      'Selected atom dihedral',
    ) as HTMLInputElement;
    expect(Number(dihedralInput.value)).toBeCloseTo(-90, 3);
    expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      1,
      99,
      2,
      3,
      4,
    ]);
  });

  it('sets the dihedral between four selected atoms', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3, 4] });

    render(<SelectedAtomPanel document={DIHEDRAL_FRAGMENT} />);

    fireEvent.change(screen.getByLabelText('Selected atom dihedral'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Dihedral' }));

    expect(applyMoleculeEditCommand).toHaveBeenCalledWith({
      command_type: 'set_atom_dihedral',
      document_id: 'dihedral-fragment',
      atom1_index: 1,
      atom2_index: 2,
      atom3_index: 3,
      atom4_index: 4,
      dihedral_degrees: 60,
    });
  });

  it('shows a local error for invalid dihedral edits', () => {
    const applyMoleculeEditCommand = vi.fn().mockResolvedValue(undefined);
    useDocumentStore.setState({ applyMoleculeEditCommand });
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3, 4] });

    render(<SelectedAtomPanel document={DIHEDRAL_FRAGMENT} />);

    fireEvent.change(screen.getByLabelText('Selected atom dihedral'), {
      target: { value: '181' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Dihedral' }));

    expect(
      screen.getByText('Dihedral must be between -180 and 180 degrees.'),
    ).toBeInTheDocument();
    expect(applyMoleculeEditCommand).not.toHaveBeenCalled();
  });

  it.each([
    { selectedAtomIndices: [1] },
    { selectedAtomIndices: [1, 2, 3, 99] },
  ])(
    'does not show a distance for selection $selectedAtomIndices',
    ({ selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={WATER} />);

      expect(screen.queryByText('Distance:')).not.toBeInTheDocument();
    },
  );

  it.each([
    { document: WATER, selectedAtomIndices: [1] },
    { document: WATER, selectedAtomIndices: [1, 99, 2] },
    { document: WATER_WITH_EXTRA_ATOM, selectedAtomIndices: [1, 2, 3, 4] },
  ])(
    'does not show an angle for selection $selectedAtomIndices',
    ({ document, selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={document} />);

      expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    },
  );

  it('does not invent an angle from degenerate vectors', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 4, 2] });

    render(
      <SelectedAtomPanel
        document={{
          ...WATER,
          atoms: [
            ...WATER.atoms,
            { index: 4, element: 'H', x: 0, y: 0, z: 0 },
          ],
        }}
      />,
    );

    expect(screen.queryByText('Angle:')).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([1, 4, 2]);
  });

  it.each([
    { document: DIHEDRAL_FRAGMENT, selectedAtomIndices: [1] },
    { document: DIHEDRAL_FRAGMENT, selectedAtomIndices: [1, 2, 3] },
    {
      document: DIHEDRAL_FRAGMENT_WITH_EXTRA_ATOM,
      selectedAtomIndices: [1, 2, 3, 4, 5],
    },
  ])(
    'does not show a dihedral for selection $selectedAtomIndices',
    ({ document, selectedAtomIndices }) => {
      useViewerStore.setState({ selectedAtomIndices });

      render(<SelectedAtomPanel document={document} />);

      expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('form', { name: 'Edit selected atom dihedral' }),
      ).not.toBeInTheDocument();
    },
  );

  it('does not invent a dihedral from degenerate vectors', () => {
    useViewerStore.setState({ selectedAtomIndices: [1, 2, 3, 4] });

    render(<SelectedAtomPanel document={COLLINEAR_FRAGMENT} />);

    expect(screen.queryByText('Dihedral:')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('form', { name: 'Edit selected atom dihedral' }),
    ).not.toBeInTheDocument();
    expect(useViewerStore.getState().selectedAtomIndices).toEqual([
      1,
      2,
      3,
      4,
    ]);
  });
});
