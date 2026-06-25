from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import CartesianPosition, SetAtomPositionCommand
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
