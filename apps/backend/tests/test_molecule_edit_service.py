from pathlib import Path

import pytest

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import CalculationMetadata, MoleculeDocument
from chemsmart_gui.domain.edit import CartesianPosition, SetAtomPositionCommand
from chemsmart_gui.services.molecule_edit_service import MoleculeEditService


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"


def open_water_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))


def set_atom_position_command(
    document: MoleculeDocument,
    *,
    atom_index: int = 2,
    document_id: str | None = None,
) -> SetAtomPositionCommand:
    return SetAtomPositionCommand(
        command_type="set_atom_position",
        document_id=document_id or document.id,
        atom_index=atom_index,
        position=CartesianPosition(x=1.0, y=1.1, z=1.2),
        coordinate_unit="angstrom",
    )


def test_apply_set_atom_position_updates_target_atom() -> None:
    document = open_water_document().model_copy(
        update={
            "calculation": CalculationMetadata(
                program="gaussian",
                normal_termination=True,
            )
        },
        deep=True,
    )
    command = set_atom_position_command(document)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.id != document.id
    assert updated.name.startswith("str-H2O-")
    assert updated.source == document.source
    assert updated.calculation is None
    assert [(atom.index, atom.element) for atom in updated.atoms] == [
        (1, "O"),
        (2, "H"),
        (3, "H"),
    ]
    assert [(atom.x, atom.y, atom.z) for atom in updated.atoms] == [
        (0.0, 0.0, 0.0),
        (1.0, 1.1, 1.2),
        (-0.76, 0.58, 0.0),
    ]


def test_apply_set_atom_position_rejects_document_mismatch() -> None:
    document = open_water_document()
    command = set_atom_position_command(
        document,
        document_id="other-document",
    )

    with pytest.raises(ValueError, match="targets document"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_position_rejects_missing_atom_index() -> None:
    document = open_water_document()
    command = set_atom_position_command(document, atom_index=99)

    with pytest.raises(ValueError, match="Atom index 99"):
        MoleculeEditService().apply_command(document, command)
