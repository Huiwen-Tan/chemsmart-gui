from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.main import app


client = TestClient(app)
REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"


def open_water_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))


def test_preview_molecule_export_returns_xyz_payload() -> None:
    document = open_water_document()

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "xyz",
        },
    )

    assert response.status_code == 200
    body = response.json()
    lines = body["content"].splitlines()
    assert body["filename"] == "water.xyz"
    assert body["filetype"] == "xyz"
    assert lines[0] == "3"
    assert lines[1] == "water.xyz    Empirical formula: H2O"
    assert lines[2].split() == [
        "O",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert lines[3].split() == [
        "H",
        "0.7600000000",
        "0.5800000000",
        "0.0000000000",
    ]


def test_preview_molecule_export_uses_supplied_document_geometry() -> None:
    document = open_water_document()
    edited_document = document.model_copy(
        update={
            "atoms": [
                document.atoms[0],
                document.atoms[1].model_copy(
                    update={
                        "x": 1.0,
                        "y": 1.1,
                        "z": 1.2,
                    },
                ),
                document.atoms[2],
            ],
        },
    )

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": edited_document.model_dump(),
            "filetype": "xyz",
        },
    )

    assert response.status_code == 200
    assert response.json()["content"].splitlines()[3].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_preview_molecule_export_rejects_unsupported_filetype() -> None:
    document = open_water_document()

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "pdb",
        },
    )

    assert response.status_code == 422
