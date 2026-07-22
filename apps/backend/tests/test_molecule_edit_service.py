from pathlib import Path

import pytest

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import CalculationMetadata, MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddAtomCommand,
    AddBondCommand,
    CartesianPosition,
    DeleteAtomsCommand,
    RemoveBondCommand,
    SetAtomAngleCommand,
    SetAtomDistanceCommand,
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


def set_atom_distance_command(
    document: MoleculeDocument,
    *,
    atom1_index: int = 1,
    atom2_index: int = 2,
    distance: float = 2.5,
    document_id: str | None = None,
) -> SetAtomDistanceCommand:
    return SetAtomDistanceCommand(
        command_type="set_atom_distance",
        document_id=document_id or document.id,
        atom1_index=atom1_index,
        atom2_index=atom2_index,
        distance=distance,
        coordinate_unit="angstrom",
    )


def set_atom_angle_command(
    document: MoleculeDocument,
    *,
    atom1_index: int = 1,
    vertex_atom_index: int = 2,
    atom3_index: int = 3,
    angle_degrees: float = 60.0,
    document_id: str | None = None,
) -> SetAtomAngleCommand:
    return SetAtomAngleCommand(
        command_type="set_atom_angle",
        document_id=document_id or document.id,
        atom1_index=atom1_index,
        vertex_atom_index=vertex_atom_index,
        atom3_index=atom3_index,
        angle_degrees=angle_degrees,
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


def add_atom_command(
    document: MoleculeDocument,
    *,
    element: str = "He",
    document_id: str | None = None,
) -> AddAtomCommand:
    return AddAtomCommand(
        command_type="add_atom",
        document_id=document_id or document.id,
        element=element,
        position=CartesianPosition(x=1.0, y=1.1, z=1.2),
        coordinate_unit="angstrom",
    )


def delete_atoms_command(
    document: MoleculeDocument,
    *,
    atom_indices: list[int] | None = None,
    document_id: str | None = None,
) -> DeleteAtomsCommand:
    return DeleteAtomsCommand(
        command_type="delete_atoms",
        document_id=document_id or document.id,
        atom_indices=atom_indices or [2],
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


def test_apply_set_atom_distance_moves_second_atom() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0],
                water.atoms[1].model_copy(
                    update={"x": 1.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2],
            ]
        },
        deep=True,
    )
    command = set_atom_distance_command(document, distance=2.5)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.id != document.id
    assert updated.source == document.source
    assert updated.calculation is None
    assert (updated.atoms[0].x, updated.atoms[0].y, updated.atoms[0].z) == (
        0.0,
        0.0,
        0.0,
    )
    assert updated.atoms[1].x == pytest.approx(2.5)
    assert updated.atoms[1].y == pytest.approx(0.0)
    assert updated.atoms[1].z == pytest.approx(0.0)
    assert updated.bonds == document.bonds


def test_apply_set_atom_distance_preserves_direction() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0],
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 2.0, "z": 0.0}
                ),
                water.atoms[2],
            ]
        },
        deep=True,
    )
    command = set_atom_distance_command(document, distance=1.5)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.atoms[1].x == pytest.approx(0.0)
    assert updated.atoms[1].y == pytest.approx(1.5)
    assert updated.atoms[1].z == pytest.approx(0.0)


def test_apply_set_atom_distance_rejects_identical_atoms() -> None:
    document = open_water_document()
    command = set_atom_distance_command(
        document,
        atom1_index=2,
        atom2_index=2,
    )

    with pytest.raises(ValueError, match="two different atoms"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_distance_rejects_missing_atom() -> None:
    document = open_water_document()
    command = set_atom_distance_command(document, atom2_index=99)

    with pytest.raises(ValueError, match="Atom index 99"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_distance_rejects_degenerate_positions() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0],
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2],
            ]
        },
        deep=True,
    )
    command = set_atom_distance_command(document)

    with pytest.raises(ValueError, match="degenerate"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_angle_moves_third_atom_in_current_plane() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0].model_copy(
                    update={"x": 1.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2].model_copy(
                    update={"x": 0.0, "y": 1.0, "z": 0.0}
                ),
            ]
        },
        deep=True,
    )
    command = set_atom_angle_command(document, angle_degrees=60.0)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.id != document.id
    assert updated.source == document.source
    assert updated.calculation is None
    assert (updated.atoms[0].x, updated.atoms[0].y, updated.atoms[0].z) == (
        1.0,
        0.0,
        0.0,
    )
    assert (updated.atoms[1].x, updated.atoms[1].y, updated.atoms[1].z) == (
        0.0,
        0.0,
        0.0,
    )
    assert updated.atoms[2].x == pytest.approx(0.5)
    assert updated.atoms[2].y == pytest.approx(0.8660254038)
    assert updated.atoms[2].z == pytest.approx(0.0)
    assert updated.bonds == document.bonds


def test_apply_set_atom_angle_preserves_vertex_to_third_distance() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0].model_copy(
                    update={"x": 1.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2].model_copy(
                    update={"x": 0.0, "y": 2.0, "z": 0.0}
                ),
            ]
        },
        deep=True,
    )
    command = set_atom_angle_command(document, angle_degrees=120.0)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.atoms[2].x == pytest.approx(-1.0)
    assert updated.atoms[2].y == pytest.approx(1.7320508076)
    assert updated.atoms[2].z == pytest.approx(0.0)


def test_apply_set_atom_angle_rejects_duplicate_atoms() -> None:
    document = open_water_document()
    command = set_atom_angle_command(
        document,
        atom1_index=1,
        vertex_atom_index=2,
        atom3_index=1,
    )

    with pytest.raises(ValueError, match="three different atoms"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_angle_rejects_missing_atom() -> None:
    document = open_water_document()
    command = set_atom_angle_command(document, atom3_index=99)

    with pytest.raises(ValueError, match="Atom index 99"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_angle_rejects_degenerate_positions() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0],
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
            ]
        },
        deep=True,
    )
    command = set_atom_angle_command(document)

    with pytest.raises(ValueError, match="degenerate"):
        MoleculeEditService().apply_command(document, command)


def test_apply_set_atom_angle_rejects_degenerate_angle_plane() -> None:
    water = open_water_document()
    document = water.model_copy(
        update={
            "atoms": [
                water.atoms[0].model_copy(
                    update={"x": 1.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[1].model_copy(
                    update={"x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2].model_copy(
                    update={"x": -1.0, "y": 0.0, "z": 0.0}
                ),
            ]
        },
        deep=True,
    )
    command = set_atom_angle_command(document, angle_degrees=90.0)

    with pytest.raises(ValueError, match="angle plane is degenerate"):
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


def test_apply_add_atom_appends_atom_and_refreshes_structure() -> None:
    document = open_water_document().model_copy(
        update={
            "calculation": CalculationMetadata(
                program="gaussian",
                normal_termination=True,
            )
        },
        deep=True,
    )
    command = add_atom_command(document)

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.id != document.id
    assert updated.source == document.source
    assert updated.calculation is None
    assert [(atom.index, atom.element) for atom in updated.atoms] == [
        (1, "O"),
        (2, "H"),
        (3, "H"),
        (4, "He"),
    ]
    assert [(atom.x, atom.y, atom.z) for atom in updated.atoms][-1] == (
        1.0,
        1.1,
        1.2,
    )
    assert updated.bonds == document.bonds


def test_apply_add_atom_strips_element() -> None:
    document = open_water_document()
    command = add_atom_command(document, element=" He ")

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.atoms[-1].element == "He"


def test_apply_add_atom_rejects_blank_element() -> None:
    document = open_water_document()
    command = add_atom_command(document, element=" ")

    with pytest.raises(ValueError, match="Atom element is required"):
        MoleculeEditService().apply_command(document, command)


def test_apply_add_atom_rejects_document_mismatch() -> None:
    document = open_water_document()
    command = add_atom_command(document, document_id="other-document")

    with pytest.raises(ValueError, match="targets document"):
        MoleculeEditService().apply_command(document, command)


def test_apply_delete_atoms_removes_atoms_and_remaps_bonds() -> None:
    document = open_water_document()
    command = delete_atoms_command(document, atom_indices=[2])

    updated = MoleculeEditService().apply_command(document, command)

    assert updated.id != document.id
    assert updated.source == document.source
    assert updated.calculation is None
    assert [(atom.index, atom.element) for atom in updated.atoms] == [
        (1, "O"),
        (2, "H"),
    ]
    assert updated.bonds == [Bond(atom1=1, atom2=2)]


def test_apply_delete_atoms_deletes_multiple_atoms() -> None:
    document = open_water_document()
    command = delete_atoms_command(document, atom_indices=[2, 3])

    updated = MoleculeEditService().apply_command(document, command)

    assert [(atom.index, atom.element) for atom in updated.atoms] == [(1, "O")]
    assert updated.bonds == []


def test_apply_delete_atoms_rejects_missing_atom() -> None:
    document = open_water_document()
    command = delete_atoms_command(document, atom_indices=[99])

    with pytest.raises(ValueError, match="Atom index 99"):
        MoleculeEditService().apply_command(document, command)


def test_apply_delete_atoms_rejects_deleting_every_atom() -> None:
    document = open_water_document()
    command = delete_atoms_command(document, atom_indices=[1, 2, 3])

    with pytest.raises(ValueError, match="Cannot delete every atom"):
        MoleculeEditService().apply_command(document, command)


def test_apply_delete_atoms_rejects_document_mismatch() -> None:
    document = open_water_document()
    command = delete_atoms_command(document, document_id="other-document")

    with pytest.raises(ValueError, match="targets document"):
        MoleculeEditService().apply_command(document, command)
