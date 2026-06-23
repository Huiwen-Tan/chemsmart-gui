from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from chemsmart_gui.api.documents import get_document_service, open_document
from chemsmart_gui.domain.document import OpenDocumentRequest
from chemsmart_gui.main import app
from chemsmart_gui.services.chemsmart_document_service import (
    ChemsmartDocumentService,
)


client = TestClient(app)
WATER_STRUCTURE_ID = (
    "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
)


def test_default_document_service_is_chemsmart_backed() -> None:
    assert isinstance(get_document_service(), ChemsmartDocumentService)


def test_open_document_returns_molecule_document() -> None:
    response = client.post(
        "/api/documents/open",
        json={"path": "sample-data/water.xyz"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == WATER_STRUCTURE_ID
    assert body["name"] == "str-H2O-102b86d02472"
    assert body["document_kind"] == "structure"
    assert body["source"] == {
        "path": "sample-data/water.xyz",
        "filename": "water.xyz",
        "filetype": "xyz",
    }
    assert body["coordinate_unit"] == "angstrom"
    assert body["charge"] is None
    assert body["multiplicity"] is None
    assert [atom["index"] for atom in body["atoms"]] == [1, 2, 3]
    assert len(body["atoms"]) == 3
    assert len(body["bonds"]) == 2


def test_get_document_returns_existing_document() -> None:
    client.post("/api/documents/open", json={"path": "sample-data/water.xyz"})

    response = client.get(f"/api/documents/{WATER_STRUCTURE_ID}")

    assert response.status_code == 200
    assert response.json()["id"] == WATER_STRUCTURE_ID


def test_open_document_parses_requested_xyz(tmp_path: Path) -> None:
    helium_path = tmp_path / "helium.xyz"
    helium_path.write_text("1\nHelium\nHe 1.5 0.0 0.0\n", encoding="utf-8")

    response = client.post(
        "/api/documents/open",
        json={"path": str(helium_path)},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["document_kind"] == "structure"
    assert body["source"] == {
        "path": str(helium_path),
        "filename": "helium.xyz",
        "filetype": "xyz",
    }
    assert body["name"].startswith("str-He-")
    assert body["atoms"] == [
        {"index": 1, "element": "He", "x": 1.5, "y": 0.0, "z": 0.0}
    ]
    assert body["bonds"] == []


@pytest.mark.parametrize(
    ("path", "filename", "filetype"),
    [
        ("sample-data/water.com", "water.com", "com"),
        ("sample-data/water.gjf", "water.gjf", "gjf"),
    ],
)
def test_open_document_parses_gaussian_input(
    path: str,
    filename: str,
    filetype: str,
) -> None:
    response = client.post("/api/documents/open", json={"path": path})

    assert response.status_code == 200
    body = response.json()
    assert body["document_kind"] == "structure"
    assert body["source"] == {
        "path": path,
        "filename": filename,
        "filetype": filetype,
    }
    assert body["charge"] == 0
    assert body["multiplicity"] == 1
    assert body["atoms"] == [
        {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.0},
        {"index": 2, "element": "H", "x": 0.76, "y": 0.58, "z": 0.0},
        {"index": 3, "element": "H", "x": -0.76, "y": 0.58, "z": 0.0},
    ]


def test_open_document_parses_orca_input() -> None:
    response = client.post(
        "/api/documents/open",
        json={"path": "sample-data/water.inp"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["document_kind"] == "structure"
    assert body["source"] == {
        "path": "sample-data/water.inp",
        "filename": "water.inp",
        "filetype": "inp",
    }
    assert body["charge"] == 0
    assert body["multiplicity"] == 1
    assert body["atoms"] == [
        {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.0626},
        {"index": 2, "element": "H", "x": -0.792, "y": 0.0, "z": -0.4973},
        {"index": 3, "element": "H", "x": 0.792, "y": 0.0, "z": -0.4973},
    ]


def test_open_document_parses_gaussian_output() -> None:
    response = client.post(
        "/api/documents/open",
        json={"path": "sample-data/water.log"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["document_kind"] == "structure"
    assert body["source"] == {
        "path": "sample-data/water.log",
        "filename": "water.log",
        "filetype": "log",
    }
    assert body["charge"] == 0
    assert body["multiplicity"] == 1
    assert body["atoms"] == [
        {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.118224},
        {
            "index": 2,
            "element": "H",
            "x": -0.0,
            "y": 0.758169,
            "z": -0.472896,
        },
        {
            "index": 3,
            "element": "H",
            "x": -0.0,
            "y": -0.758169,
            "z": -0.472896,
        },
    ]


def test_open_document_reports_missing_request_path() -> None:
    response = client.post("/api/documents/open", json={})

    assert response.status_code == 400
    assert response.json()["detail"] == "A document path is required."


def test_open_document_reports_missing_file(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.xyz"

    response = client.post(
        "/api/documents/open",
        json={"path": str(missing_path)},
    )

    assert response.status_code == 404
    assert response.json()["detail"].endswith("could not be found!")


@pytest.mark.parametrize(
    ("filename", "contents", "detail_fragment"),
    [
        ("corrupt.xyz", "Invalid file content", "Could not open molecular file"),
        ("empty.xyz", "", "No molecular structure found"),
        ("unknown.foo", "Unknown format", "Unsupported molecular file format"),
    ],
)
def test_open_document_reports_invalid_file(
    tmp_path: Path,
    filename: str,
    contents: str,
    detail_fragment: str,
) -> None:
    invalid_path = tmp_path / filename
    invalid_path.write_text(contents, encoding="utf-8")

    response = client.post(
        "/api/documents/open",
        json={"path": str(invalid_path)},
    )

    assert response.status_code == 400
    assert detail_fragment in response.json()["detail"]


def test_open_document_does_not_hide_unexpected_errors() -> None:
    document_service = Mock()
    document_service.open_document.side_effect = RuntimeError("unexpected")

    with pytest.raises(RuntimeError, match="unexpected"):
        open_document(
            OpenDocumentRequest(path="molecule.xyz"),
            document_service=document_service,
        )
