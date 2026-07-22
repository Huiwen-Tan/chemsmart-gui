import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.main import app


client = TestClient(app)
REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
WATER_COM_PATH = REPOSITORY_ROOT / "sample-data" / "water.com"
WATER_GJF_PATH = REPOSITORY_ROOT / "sample-data" / "water.gjf"
WATER_INP_PATH = REPOSITORY_ROOT / "sample-data" / "water.inp"


def open_water_document() -> MoleculeDocument:
    return ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))


def test_write_molecule_export_writes_xyz_to_new_target(
    tmp_path: Path,
) -> None:
    document = open_water_document()
    target_path = tmp_path / "water-copy.xyz"

    response = client.post(
        "/api/documents/export",
        json={
            "document": document.model_dump(),
            "filetype": "xyz",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 200
    body = response.json()
    content = target_path.read_text(encoding="utf-8")
    assert body == {
        "filename": "water-copy.xyz",
        "filetype": "xyz",
        "path": str(target_path),
        "bytes_written": len(content.encode("utf-8")),
    }
    assert content.splitlines()[0] == "3"
    assert content.splitlines()[2].split() == [
        "O",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]


def test_write_molecule_export_writes_gjf_to_new_target(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    target_path = tmp_path / "water-edited.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
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
        "/api/documents/export",
        json={
            "document": edited_document.model_dump(),
            "filetype": "gjf",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 200
    body = response.json()
    lines = target_path.read_text(encoding="utf-8").splitlines()
    assert body["filename"] == "water-edited.gjf"
    assert body["filetype"] == "gjf"
    assert body["path"] == str(target_path)
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[9].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_write_molecule_export_writes_com_to_new_target(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.com"
    target_path = tmp_path / "water-edited.com"
    shutil.copyfile(WATER_COM_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
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
        "/api/documents/export",
        json={
            "document": edited_document.model_dump(),
            "filetype": "com",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 200
    body = response.json()
    lines = target_path.read_text(encoding="utf-8").splitlines()
    assert body["filename"] == "water-edited.com"
    assert body["filetype"] == "com"
    assert body["path"] == str(target_path)
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[9].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_write_molecule_export_writes_frozen_gjf_to_new_target(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    target_path = tmp_path / "water-frozen.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    frozen_document = document.model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/export",
        json={
            "document": frozen_document.model_dump(),
            "filetype": "gjf",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 200
    lines = target_path.read_text(encoding="utf-8").splitlines()
    assert lines[8].split() == [
        "O",
        "-1",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert lines[9].split()[1] == "0"
    assert lines[10].split()[1] == "-1"


def test_write_molecule_export_writes_frozen_inp_to_new_target(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.inp"
    target_path = tmp_path / "water-frozen.inp"
    shutil.copyfile(WATER_INP_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    frozen_document = document.model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/export",
        json={
            "document": frozen_document.model_dump(),
            "filetype": "inp",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 200
    content = target_path.read_text(encoding="utf-8")
    assert "%geom" in content
    assert "{ C 0 C }" in content
    assert "{ C 2 C }" in content
    assert "{ C 1 C }" not in content


def test_write_molecule_export_rejects_existing_target(
    tmp_path: Path,
) -> None:
    document = open_water_document()
    target_path = tmp_path / "water-copy.xyz"
    target_path.write_text("original content\n", encoding="utf-8")

    response = client.post(
        "/api/documents/export",
        json={
            "document": document.model_dump(),
            "filetype": "xyz",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]
    assert target_path.read_text(encoding="utf-8") == "original content\n"


def test_write_molecule_export_rejects_target_extension_mismatch(
    tmp_path: Path,
) -> None:
    document = open_water_document()
    target_path = tmp_path / "water-copy.gjf"

    response = client.post(
        "/api/documents/export",
        json={
            "document": document.model_dump(),
            "filetype": "xyz",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 400
    assert "must end with .xyz" in response.json()["detail"]
    assert not target_path.exists()


def test_write_molecule_export_rejects_stale_input_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    target_path = tmp_path / "water-edited.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(
        source_path.read_text(encoding="utf-8") + "\n",
        encoding="utf-8",
    )

    response = client.post(
        "/api/documents/export",
        json={
            "document": document.model_dump(),
            "filetype": "gjf",
            "target_path": str(target_path),
        },
    )

    assert response.status_code == 400
    assert "changed since this document was opened" in response.json()[
        "detail"
    ]
    assert not target_path.exists()
