import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from chemsmart_gui.domain.edit import (
    AddBondCommand,
    CartesianPosition,
    RemoveBondCommand,
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


def test_shared_schema_expresses_edit_command_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    command_schemas = {
        command_schema["title"]: command_schema
        for command_schema in schema["oneOf"]
    }
    set_atom_schema = command_schemas["SetAtomPositionCommand"]
    add_bond_schema = command_schemas["AddBondCommand"]
    remove_bond_schema = command_schemas["RemoveBondCommand"]
    properties = set_atom_schema["properties"]

    assert schema["title"] == "MoleculeEditCommand"
    assert set(command_schemas) == {
        "SetAtomPositionCommand",
        "AddBondCommand",
        "RemoveBondCommand",
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
