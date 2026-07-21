from pathlib import Path

import pytest

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import CalculationMetadata, MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddBondCommand,
    CartesianPosition,
    RemoveBondCommand,
    SetAtomPositionCommand,
)
from chemsmart_gui.domain.molecule import Bond
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


def add_bond_command(
    document: MoleculeDocument,
    *,
    atom1_index: int = 2,
    atom2_index: int = 3,
    document_id: str | None = None,
) -> AddBondCommand:
    return AddBondCommand(
        command_type="add_bond",
        document_id=document_id or document.id,
        atom1_index=atom1_index,
        atom2_index=atom2_index,
    )


def remove_bond_command(
    document: MoleculeDocument,
    *,
    atom1_index: int = 2,
    atom2_index: int = 1,
    document_id: str | None = None,
) -> RemoveBondCommand:
    return RemoveBondCommand(
        command_type="remove_bond",
        document_id=document_id or document.id,
        atom1_index=atom1_index,
        atom2_index=atom2_index,
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
    assert updated.bonds == document.bonds


def test_apply_set_atom_position_preserves_manual_bonds() -> None:
    document = open_water_document().model_copy(
        update={"bonds": [Bond(atom1=2, atom2=3)]},
        deep=True,
    )
    command = set_atom_position_command(document)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.bonds == [Bond(atom1=2, atom2=3)]


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


def test_apply_add_bond_adds_bond_between_existing_atoms() -> None:
    document = open_water_document().model_copy(
        update={
            "calculation": CalculationMetadata(
                program="gaussian",
                normal_termination=True,
            )
        },
        deep=True,
    )
    command = add_bond_command(document, atom1_index=3, atom2_index=2)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.source == document.source
    assert updated.calculation is None
    assert updated.bonds == [
        Bond(atom1=1, atom2=2),
        Bond(atom1=1, atom2=3),
        Bond(atom1=2, atom2=3),
    ]


def test_apply_add_bond_rejects_duplicate_bond() -> None:
    document = open_water_document()
    command = add_bond_command(document, atom1_index=2, atom2_index=1)

    with pytest.raises(ValueError, match="already exists"):
        MoleculeEditService().apply_command(document, command)


def test_apply_add_bond_rejects_identical_atoms() -> None:
    document = open_water_document()
    command = add_bond_command(document, atom1_index=2, atom2_index=2)

    with pytest.raises(ValueError, match="two different atoms"):
        MoleculeEditService().apply_command(document, command)


def test_apply_add_bond_rejects_missing_atom_index() -> None:
    document = open_water_document()
    command = add_bond_command(document, atom1_index=2, atom2_index=99)

    with pytest.raises(ValueError, match="Atom index 99"):
        MoleculeEditService().apply_command(document, command)


def test_apply_remove_bond_removes_bond_regardless_of_order() -> None:
    document = open_water_document()
    command = remove_bond_command(document, atom1_index=2, atom2_index=1)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.bonds == [Bond(atom1=1, atom2=3)]


def test_apply_remove_bond_rejects_missing_bond() -> None:
    document = open_water_document()
    command = remove_bond_command(document, atom1_index=2, atom2_index=3)

    with pytest.raises(ValueError, match="does not exist"):
        MoleculeEditService().apply_command(document, command)
