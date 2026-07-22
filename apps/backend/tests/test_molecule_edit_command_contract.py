import json
from pathlib import Path

import pytest
from pydantic import ValidationError

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


REPOSITORY_ROOT = Path(__file__).parents[3]
SCHEMA_PATH = (
    REPOSITORY_ROOT
    / "packages"
    / "shared-schema"
    / "molecule-edit-command.schema.json"
)


def test_set_atom_position_command_serializes_contract() -> None:
    command = SetAtomPositionCommand(
        command_type="set_atom_position",
        document_id="document-water",
        atom_index=1,
        position=CartesianPosition(x=0.1, y=0.2, z=0.3),
        coordinate_unit="angstrom",
    )

    assert command.model_dump() == {
        "command_type": "set_atom_position",
        "document_id": "document-water",
        "atom_index": 1,
        "position": {"x": 0.1, "y": 0.2, "z": 0.3},
        "coordinate_unit": "angstrom",
    }


def test_set_atom_position_command_requires_1_based_atom_index() -> None:
    with pytest.raises(ValidationError):
        SetAtomPositionCommand(
            command_type="set_atom_position",
            document_id="document-water",
            atom_index=0,
            position=CartesianPosition(x=0.1, y=0.2, z=0.3),
            coordinate_unit="angstrom",
        )


def test_set_atom_distance_command_serializes_contract() -> None:
    command = SetAtomDistanceCommand(
        command_type="set_atom_distance",
        document_id="document-water",
        atom1_index=1,
        atom2_index=2,
        distance=1.5,
        coordinate_unit="angstrom",
    )

    assert command.model_dump() == {
        "command_type": "set_atom_distance",
        "document_id": "document-water",
        "atom1_index": 1,
        "atom2_index": 2,
        "distance": 1.5,
        "coordinate_unit": "angstrom",
    }


def test_set_atom_distance_command_requires_valid_indices() -> None:
    with pytest.raises(ValidationError):
        SetAtomDistanceCommand(
            command_type="set_atom_distance",
            document_id="document-water",
            atom1_index=0,
            atom2_index=2,
            distance=1.5,
            coordinate_unit="angstrom",
        )

    with pytest.raises(ValidationError):
        SetAtomDistanceCommand(
            command_type="set_atom_distance",
            document_id="document-water",
            atom1_index=1,
            atom2_index=2,
            distance=0,
            coordinate_unit="angstrom",
        )


def test_set_atom_angle_command_serializes_contract() -> None:
    command = SetAtomAngleCommand(
        command_type="set_atom_angle",
        document_id="document-water",
        atom1_index=1,
        vertex_atom_index=2,
        atom3_index=3,
        angle_degrees=109.5,
    )

    assert command.model_dump() == {
        "command_type": "set_atom_angle",
        "document_id": "document-water",
        "atom1_index": 1,
        "vertex_atom_index": 2,
        "atom3_index": 3,
        "angle_degrees": 109.5,
    }


def test_set_atom_angle_command_requires_valid_indices_and_angle() -> None:
    with pytest.raises(ValidationError):
        SetAtomAngleCommand(
            command_type="set_atom_angle",
            document_id="document-water",
            atom1_index=0,
            vertex_atom_index=2,
            atom3_index=3,
            angle_degrees=109.5,
        )

    with pytest.raises(ValidationError):
        SetAtomAngleCommand(
            command_type="set_atom_angle",
            document_id="document-water",
            atom1_index=1,
            vertex_atom_index=2,
            atom3_index=3,
            angle_degrees=0,
        )

    with pytest.raises(ValidationError):
        SetAtomAngleCommand(
            command_type="set_atom_angle",
            document_id="document-water",
            atom1_index=1,
            vertex_atom_index=2,
            atom3_index=3,
            angle_degrees=180,
        )


def test_add_bond_command_serializes_contract() -> None:
    command = AddBondCommand(
        command_type="add_bond",
        document_id="document-water",
        atom1_index=1,
        atom2_index=2,
    )

    assert command.model_dump() == {
        "command_type": "add_bond",
        "document_id": "document-water",
        "atom1_index": 1,
        "atom2_index": 2,
    }


def test_remove_bond_command_serializes_contract() -> None:
    command = RemoveBondCommand(
        command_type="remove_bond",
        document_id="document-water",
        atom1_index=2,
        atom2_index=1,
    )

    assert command.model_dump() == {
        "command_type": "remove_bond",
        "document_id": "document-water",
        "atom1_index": 2,
        "atom2_index": 1,
    }


def test_bond_commands_require_1_based_atom_indices() -> None:
    with pytest.raises(ValidationError):
        AddBondCommand(
            command_type="add_bond",
            document_id="document-water",
            atom1_index=0,
            atom2_index=2,
        )

    with pytest.raises(ValidationError):
        RemoveBondCommand(
            command_type="remove_bond",
            document_id="document-water",
            atom1_index=1,
            atom2_index=0,
        )


def test_add_atom_command_serializes_contract() -> None:
    command = AddAtomCommand(
        command_type="add_atom",
        document_id="document-water",
        element="He",
        position=CartesianPosition(x=1.0, y=1.1, z=1.2),
        coordinate_unit="angstrom",
    )

    assert command.model_dump() == {
        "command_type": "add_atom",
        "document_id": "document-water",
        "element": "He",
        "position": {"x": 1.0, "y": 1.1, "z": 1.2},
        "coordinate_unit": "angstrom",
    }


def test_add_atom_command_requires_element() -> None:
    with pytest.raises(ValidationError):
        AddAtomCommand(
            command_type="add_atom",
            document_id="document-water",
            element="",
            position=CartesianPosition(x=1.0, y=1.1, z=1.2),
            coordinate_unit="angstrom",
        )


def test_delete_atoms_command_serializes_contract() -> None:
    command = DeleteAtomsCommand(
        command_type="delete_atoms",
        document_id="document-water",
        atom_indices=[2, 3],
    )

    assert command.model_dump() == {
        "command_type": "delete_atoms",
        "document_id": "document-water",
        "atom_indices": [2, 3],
    }


def test_delete_atoms_command_requires_1_based_atom_indices() -> None:
    with pytest.raises(ValidationError):
        DeleteAtomsCommand(
            command_type="delete_atoms",
            document_id="document-water",
            atom_indices=[0],
        )


def test_delete_atoms_command_requires_non_empty_selection() -> None:
    with pytest.raises(ValidationError):
        DeleteAtomsCommand(
            command_type="delete_atoms",
            document_id="document-water",
            atom_indices=[],
        )


def test_shared_schema_expresses_edit_command_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    command_schemas = {
        command_schema["title"]: command_schema
        for command_schema in schema["oneOf"]
    }
    set_atom_schema = command_schemas["SetAtomPositionCommand"]
    add_bond_schema = command_schemas["AddBondCommand"]
    set_distance_schema = command_schemas["SetAtomDistanceCommand"]
    remove_bond_schema = command_schemas["RemoveBondCommand"]
    set_angle_schema = command_schemas["SetAtomAngleCommand"]
    add_atom_schema = command_schemas["AddAtomCommand"]
    delete_atoms_schema = command_schemas["DeleteAtomsCommand"]
    properties = set_atom_schema["properties"]

    assert schema["title"] == "MoleculeEditCommand"
    assert set(command_schemas) == {
        "SetAtomPositionCommand",
        "AddBondCommand",
        "SetAtomDistanceCommand",
        "RemoveBondCommand",
        "SetAtomAngleCommand",
        "AddAtomCommand",
        "DeleteAtomsCommand",
    }
    assert set_atom_schema["required"] == [
        "command_type",
        "document_id",
        "atom_index",
        "position",
        "coordinate_unit",
    ]
    assert properties["command_type"]["const"] == "set_atom_position"
    assert properties["document_id"]["minLength"] == 1
    assert properties["atom_index"]["minimum"] == 1
    assert properties["position"]["required"] == ["x", "y", "z"]
    assert properties["coordinate_unit"]["const"] == "angstrom"
    assert add_bond_schema["required"] == [
        "command_type",
        "document_id",
        "atom1_index",
        "atom2_index",
    ]
    assert add_bond_schema["properties"]["command_type"]["const"] == "add_bond"
    assert add_bond_schema["properties"]["document_id"]["minLength"] == 1
    assert add_bond_schema["properties"]["atom1_index"]["minimum"] == 1
    assert add_bond_schema["properties"]["atom2_index"]["minimum"] == 1
    assert set_distance_schema["required"] == [
        "command_type",
        "document_id",
        "atom1_index",
        "atom2_index",
        "distance",
        "coordinate_unit",
    ]
    assert (
        set_distance_schema["properties"]["command_type"]["const"]
        == "set_atom_distance"
    )
    assert set_distance_schema["properties"]["document_id"]["minLength"] == 1
    assert set_distance_schema["properties"]["atom1_index"]["minimum"] == 1
    assert set_distance_schema["properties"]["atom2_index"]["minimum"] == 1
    assert (
        set_distance_schema["properties"]["distance"]["exclusiveMinimum"] == 0
    )
    assert set_distance_schema["properties"]["coordinate_unit"]["const"] == (
        "angstrom"
    )
    assert remove_bond_schema["required"] == [
        "command_type",
        "document_id",
        "atom1_index",
        "atom2_index",
    ]
    assert (
        remove_bond_schema["properties"]["command_type"]["const"]
        == "remove_bond"
    )
    assert remove_bond_schema["properties"]["document_id"]["minLength"] == 1
    assert remove_bond_schema["properties"]["atom1_index"]["minimum"] == 1
    assert remove_bond_schema["properties"]["atom2_index"]["minimum"] == 1
    assert set_angle_schema["required"] == [
        "command_type",
        "document_id",
        "atom1_index",
        "vertex_atom_index",
        "atom3_index",
        "angle_degrees",
    ]
    assert (
        set_angle_schema["properties"]["command_type"]["const"]
        == "set_atom_angle"
    )
    assert set_angle_schema["properties"]["document_id"]["minLength"] == 1
    assert set_angle_schema["properties"]["atom1_index"]["minimum"] == 1
    assert (
        set_angle_schema["properties"]["vertex_atom_index"]["minimum"] == 1
    )
    assert set_angle_schema["properties"]["atom3_index"]["minimum"] == 1
    assert (
        set_angle_schema["properties"]["angle_degrees"]["exclusiveMinimum"]
        == 0
    )
    assert (
        set_angle_schema["properties"]["angle_degrees"]["exclusiveMaximum"]
        == 180
    )
    assert add_atom_schema["required"] == [
        "command_type",
        "document_id",
        "element",
        "position",
        "coordinate_unit",
    ]
    assert add_atom_schema["properties"]["command_type"]["const"] == "add_atom"
    assert add_atom_schema["properties"]["document_id"]["minLength"] == 1
    assert add_atom_schema["properties"]["element"]["minLength"] == 1
    assert add_atom_schema["properties"]["position"]["required"] == [
        "x",
        "y",
        "z",
    ]
    assert add_atom_schema["properties"]["coordinate_unit"]["const"] == (
        "angstrom"
    )
    assert delete_atoms_schema["required"] == [
        "command_type",
        "document_id",
        "atom_indices",
    ]
    assert delete_atoms_schema["properties"]["command_type"]["const"] == (
        "delete_atoms"
    )
    assert delete_atoms_schema["properties"]["document_id"]["minLength"] == 1
    assert delete_atoms_schema["properties"]["atom_indices"]["minItems"] == 1
    assert (
        delete_atoms_schema["properties"]["atom_indices"]["items"]["minimum"]
        == 1
    )
