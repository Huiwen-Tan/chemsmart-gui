from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddAtomCommand,
    AddBondCommand,
    CartesianPosition,
    DeleteAtomsCommand,
    RemoveBondCommand,
    SetAtomAngleCommand,
    SetAtomDihedralCommand,
    SetAtomDistanceCommand,
    SetAtomPositionCommand,
    SetFrozenAtomsCommand,
)
from chemsmart_gui.domain.molecule import Atom
from chemsmart_gui.main import app


client = TestClient(app)
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
) -> SetAtomDistanceCommand:
    return SetAtomDistanceCommand(
        command_type="set_atom_distance",
        document_id=document.id,
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
) -> SetAtomAngleCommand:
    return SetAtomAngleCommand(
        command_type="set_atom_angle",
        document_id=document.id,
        atom1_index=atom1_index,
        vertex_atom_index=vertex_atom_index,
        atom3_index=atom3_index,
        angle_degrees=angle_degrees,
    )


def set_atom_dihedral_command(
    document: MoleculeDocument,
    *,
    atom1_index: int = 1,
    atom2_index: int = 2,
    atom3_index: int = 3,
    atom4_index: int = 4,
    dihedral_degrees: float = 60.0,
) -> SetAtomDihedralCommand:
    return SetAtomDihedralCommand(
        command_type="set_atom_dihedral",
        document_id=document.id,
        atom1_index=atom1_index,
        atom2_index=atom2_index,
        atom3_index=atom3_index,
        atom4_index=atom4_index,
        dihedral_degrees=dihedral_degrees,
    )


def make_dihedral_document() -> MoleculeDocument:
    water = open_water_document()
    return water.model_copy(
        update={
            "atoms": [
                water.atoms[0].model_copy(
                    update={"element": "C", "x": 1.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[1].model_copy(
                    update={"element": "C", "x": 0.0, "y": 0.0, "z": 0.0}
                ),
                water.atoms[2].model_copy(
                    update={"element": "C", "x": 0.0, "y": 1.0, "z": 0.0}
                ),
                Atom(index=4, element="H", x=0.0, y=1.0, z=1.0),
            ],
            "bonds": [],
        },
        deep=True,
    )


def add_bond_command(document: MoleculeDocument) -> AddBondCommand:
    return AddBondCommand(
        command_type="add_bond",
        document_id=document.id,
        atom1_index=2,
        atom2_index=3,
    )


def remove_bond_command(document: MoleculeDocument) -> RemoveBondCommand:
    return RemoveBondCommand(
        command_type="remove_bond",
        document_id=document.id,
        atom1_index=2,
        atom2_index=1,
    )


def add_atom_command(document: MoleculeDocument) -> AddAtomCommand:
    return AddAtomCommand(
        command_type="add_atom",
        document_id=document.id,
        element="He",
        position=CartesianPosition(x=1.0, y=1.1, z=1.2),
        coordinate_unit="angstrom",
    )


def delete_atoms_command(document: MoleculeDocument) -> DeleteAtomsCommand:
    return DeleteAtomsCommand(
        command_type="delete_atoms",
        document_id=document.id,
        atom_indices=[2],
    )


def set_frozen_atoms_command(
    document: MoleculeDocument,
) -> SetFrozenAtomsCommand:
    return SetFrozenAtomsCommand(
        command_type="set_frozen_atoms",
        document_id=document.id,
        atom_indices=[1, 3],
        action="replace",
    )


def test_apply_molecule_edit_command_returns_updated_document() -> None:
    document = open_water_document()
    command = set_atom_position_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["source"] == document.source.model_dump()
    assert body["document"]["calculation"] is None
    assert body["document"]["atoms"] == [
        {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.0},
        {"index": 2, "element": "H", "x": 1.0, "y": 1.1, "z": 1.2},
        {"index": 3, "element": "H", "x": -0.76, "y": 0.58, "z": 0.0},
    ]
    assert body["document"]["bonds"] == [
        {"atom1": 1, "atom2": 2},
        {"atom1": 1, "atom2": 3},
    ]


def test_apply_set_atom_distance_command_returns_updated_document() -> None:
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
    command = set_atom_distance_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["atoms"][0] == {
        "index": 1,
        "element": "O",
        "x": 0.0,
        "y": 0.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][1]["x"] == pytest.approx(2.5)
    assert body["document"]["atoms"][1]["y"] == pytest.approx(0.0)
    assert body["document"]["atoms"][1]["z"] == pytest.approx(0.0)
    assert body["document"]["bonds"] == [
        {"atom1": 1, "atom2": 2},
        {"atom1": 1, "atom2": 3},
    ]


def test_apply_set_atom_angle_command_returns_updated_document() -> None:
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
    command = set_atom_angle_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["atoms"][0] == {
        "index": 1,
        "element": "O",
        "x": 1.0,
        "y": 0.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][1] == {
        "index": 2,
        "element": "H",
        "x": 0.0,
        "y": 0.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][2]["x"] == pytest.approx(0.5)
    assert body["document"]["atoms"][2]["y"] == pytest.approx(0.8660254038)
    assert body["document"]["atoms"][2]["z"] == pytest.approx(0.0)
    assert body["document"]["bonds"] == [
        {"atom1": 1, "atom2": 2},
        {"atom1": 1, "atom2": 3},
    ]


def test_apply_set_atom_dihedral_command_returns_updated_document() -> None:
    document = make_dihedral_document()
    command = set_atom_dihedral_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["atoms"][0] == {
        "index": 1,
        "element": "C",
        "x": 1.0,
        "y": 0.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][1] == {
        "index": 2,
        "element": "C",
        "x": 0.0,
        "y": 0.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][2] == {
        "index": 3,
        "element": "C",
        "x": 0.0,
        "y": 1.0,
        "z": 0.0,
    }
    assert body["document"]["atoms"][3]["x"] == pytest.approx(0.5)
    assert body["document"]["atoms"][3]["y"] == pytest.approx(1.0)
    assert body["document"]["atoms"][3]["z"] == pytest.approx(-0.8660254038)
    assert body["document"]["bonds"] == []


def test_apply_add_bond_command_returns_updated_document() -> None:
    document = open_water_document()
    command = add_bond_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["bonds"] == [
        {"atom1": 1, "atom2": 2},
        {"atom1": 1, "atom2": 3},
        {"atom1": 2, "atom2": 3},
    ]
    assert body["document"]["calculation"] is None


def test_apply_remove_bond_command_returns_updated_document() -> None:
    document = open_water_document()
    command = remove_bond_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["bonds"] == [{"atom1": 1, "atom2": 3}]


def test_apply_add_atom_command_returns_updated_document() -> None:
    document = open_water_document()
    command = add_atom_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["source"] == document.source.model_dump()
    assert body["document"]["calculation"] is None
    assert body["document"]["atoms"][-1] == {
        "index": 4,
        "element": "He",
        "x": 1.0,
        "y": 1.1,
        "z": 1.2,
    }
    assert body["document"]["bonds"] == [
        {"atom1": 1, "atom2": 2},
        {"atom1": 1, "atom2": 3},
    ]


def test_apply_delete_atoms_command_returns_updated_document() -> None:
    document = open_water_document()
    command = delete_atoms_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] != document.id
    assert body["document"]["atoms"] == [
        {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.0},
        {"index": 2, "element": "H", "x": -0.76, "y": 0.58, "z": 0.0},
    ]
    assert body["document"]["bonds"] == [{"atom1": 1, "atom2": 2}]


def test_apply_set_frozen_atoms_command_returns_updated_document() -> None:
    document = open_water_document()
    command = set_frozen_atoms_command(document)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["can_undo"] is True
    assert body["can_redo"] is False
    assert body["document"]["id"] == document.id
    assert body["document"]["calculation"] is None
    assert body["document"]["frozen_atom_indices"] == [1, 3]


def test_apply_molecule_edit_command_rejects_document_mismatch() -> None:
    document = open_water_document()
    command = set_atom_position_command(
        document,
        document_id="other-document",
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "targets document" in response.json()["detail"]


def test_apply_molecule_edit_command_rejects_missing_atom_index() -> None:
    document = open_water_document()
    command = set_atom_position_command(document, atom_index=99)

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "Atom index 99" in response.json()["detail"]


def test_apply_bond_edit_rejects_duplicate_bond() -> None:
    document = open_water_document()
    command = AddBondCommand(
        command_type="add_bond",
        document_id=document.id,
        atom1_index=1,
        atom2_index=2,
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_apply_set_atom_distance_rejects_identical_atoms() -> None:
    document = open_water_document()
    command = set_atom_distance_command(
        document,
        atom1_index=2,
        atom2_index=2,
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "two different atoms" in response.json()["detail"]


def test_apply_set_atom_angle_rejects_duplicate_atoms() -> None:
    document = open_water_document()
    command = set_atom_angle_command(
        document,
        atom1_index=1,
        vertex_atom_index=2,
        atom3_index=1,
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "three different atoms" in response.json()["detail"]


def test_apply_set_atom_dihedral_rejects_duplicate_atoms() -> None:
    document = make_dihedral_document()
    command = set_atom_dihedral_command(
        document,
        atom1_index=1,
        atom2_index=2,
        atom3_index=3,
        atom4_index=1,
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "four different atoms" in response.json()["detail"]


def test_apply_delete_atoms_rejects_deleting_every_atom() -> None:
    document = open_water_document()
    command = DeleteAtomsCommand(
        command_type="delete_atoms",
        document_id=document.id,
        atom_indices=[1, 2, 3],
    )

    response = client.post(
        "/api/documents/edit",
        json={
            "document": document.model_dump(),
            "command": command.model_dump(),
        },
    )

    assert response.status_code == 400
    assert "Cannot delete every atom" in response.json()["detail"]
