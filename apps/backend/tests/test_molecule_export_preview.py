import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.main import app


client = TestClient(app)
REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
WATER_GJF_PATH = REPOSITORY_ROOT / "sample-data" / "water.gjf"
WATER_INP_PATH = REPOSITORY_ROOT / "sample-data" / "water.inp"


def open_water_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))


def open_gaussian_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_GJF_PATH))


def open_orca_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_INP_PATH))


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


def test_preview_molecule_export_returns_gjf_payload() -> None:
    document = open_gaussian_document()

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "gjf",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "water.gjf"
    assert body["filetype"] == "gjf"
    assert "# hf/sto-3g opt" in body["content"]
    assert "0 1" in body["content"].splitlines()


def test_preview_molecule_export_returns_frozen_gjf_payload() -> None:
    document = open_gaussian_document().model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "gjf",
        },
    )

    assert response.status_code == 200
    lines = response.json()["content"].splitlines()
    assert lines[8].split() == [
        "O",
        "-1",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert lines[9].split()[1] == "0"
    assert lines[10].split()[1] == "-1"


def test_preview_molecule_export_returns_inp_payload() -> None:
    document = open_orca_document()

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "inp",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "water.inp"
    assert body["filetype"] == "inp"
    assert body["content"].splitlines()[0].split() == [
        "!",
        "hf",
        "def2-svp",
    ]
    assert "* xyz 0 1" in body["content"].splitlines()


def test_preview_molecule_export_returns_frozen_inp_payload() -> None:
    document = open_orca_document().model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "inp",
        },
    )

    assert response.status_code == 200
    content = response.json()["content"]
    assert "%geom" in content
    assert "{ C 0 C }" in content
    assert "{ C 2 C }" in content
    assert "{ C 1 C }" not in content


def test_preview_molecule_export_returns_bad_request_for_wrong_source() -> None:
    document = open_water_document()

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "gjf",
        },
    )

    assert response.status_code == 400
    assert "requires a Gaussian" in response.json()["detail"]


def test_preview_molecule_export_returns_bad_request_for_stale_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(
        source_path.read_text(encoding="utf-8") + "\n",
        encoding="utf-8",
    )

    response = client.post(
        "/api/documents/export-preview",
        json={
            "document": document.model_dump(),
            "filetype": "gjf",
        },
    )

    assert response.status_code == 400
    assert "changed since this document was opened" in response.json()[
        "detail"
    ]
