from pathlib import Path

import pytest

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import CartesianPosition, SetAtomPositionCommand
from chemsmart_gui.services.molecule_edit_history import MoleculeEditHistory


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"


def open_water_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))


def set_atom_position_command(
    document: MoleculeDocument,
    *,
    x: float,
) -> SetAtomPositionCommand:
    return SetAtomPositionCommand(
        command_type="set_atom_position",
        document_id=document.id,
        atom_index=2,
        position=CartesianPosition(x=x, y=1.1, z=1.2),
        coordinate_unit="angstrom",
    )


def test_edit_history_starts_with_current_document() -> None:
    document = open_water_document()

    history = MoleculeEditHistory.start(document)

    assert history.current_document == document
    assert history.current_document is not document
    assert history.can_undo is False
    assert history.can_redo is False


def test_apply_command_tracks_undo_snapshot() -> None:
    document = open_water_document()
    history = MoleculeEditHistory.start(document)
    command = set_atom_position_command(document, x=1.0)

    updated = history.apply(command)

    assert updated.current_document.id != document.id
    assert updated.current_document.atoms[1].x == 1.0
    assert updated.can_undo is True
    assert updated.can_redo is False
    assert len(updated.undo_stack) == 1
    assert updated.undo_stack[0].before_document == document
    assert updated.undo_stack[0].after_document == updated.current_document


def test_undo_restores_previous_document_and_enables_redo() -> None:
    document = open_water_document()
    applied = MoleculeEditHistory.start(document).apply(
        set_atom_position_command(document, x=1.0)
    )

    undone = applied.undo()

    assert undone.current_document == document
    assert undone.can_undo is False
    assert undone.can_redo is True
    assert len(undone.redo_stack) == 1


def test_redo_restores_undone_document_and_enables_undo() -> None:
    document = open_water_document()
    applied = MoleculeEditHistory.start(document).apply(
        set_atom_position_command(document, x=1.0)
    )
    undone = applied.undo()

    redone = undone.redo()

    assert redone.current_document == applied.current_document
    assert redone.can_undo is True
    assert redone.can_redo is False
    assert len(redone.undo_stack) == 1


def test_apply_after_undo_clears_redo_history() -> None:
    document = open_water_document()
    applied = MoleculeEditHistory.start(document).apply(
        set_atom_position_command(document, x=1.0)
    )
    undone = applied.undo()

    reapplied = undone.apply(
        set_atom_position_command(undone.current_document, x=2.0)
    )

    assert reapplied.current_document.atoms[1].x == 2.0
    assert reapplied.can_undo is True
    assert reapplied.can_redo is False
    assert len(reapplied.undo_stack) == 1
    assert reapplied.redo_stack == ()


def test_undo_without_history_raises_value_error() -> None:
    history = MoleculeEditHistory.start(open_water_document())

    with pytest.raises(ValueError, match="undo"):
        history.undo()


def test_redo_without_history_raises_value_error() -> None:
    history = MoleculeEditHistory.start(open_water_document())

    with pytest.raises(ValueError, match="redo"):
        history.redo()
