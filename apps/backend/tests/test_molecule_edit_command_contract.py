import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from chemsmart_gui.domain.edit import CartesianPosition, SetAtomPositionCommand


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


def test_shared_schema_expresses_edit_command_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    command_schema = schema["oneOf"][0]
    properties = command_schema["properties"]

    assert schema["title"] == "MoleculeEditCommand"
    assert command_schema["title"] == "SetAtomPositionCommand"
    assert command_schema["required"] == [
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
