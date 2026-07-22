import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import DocumentSource, MoleculeDocument
from chemsmart_gui.main import app


client = TestClient(app)
REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_XYZ_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
WATER_COM_PATH = REPOSITORY_ROOT / "sample-data" / "water.com"
WATER_GJF_PATH = REPOSITORY_ROOT / "sample-data" / "water.gjf"
WATER_INP_PATH = REPOSITORY_ROOT / "sample-data" / "water.inp"
WATER_LOG_PATH = REPOSITORY_ROOT / "sample-data" / "water.log"


def assert_response_source_matches_file(
    body_source: dict,
    source_path: Path,
) -> None:
    source_stat = source_path.stat()
    assert body_source == {
        "path": str(source_path),
        "filename": source_path.name,
        "filetype": source_path.suffix.lower().removeprefix("."),
        "size_bytes": source_stat.st_size,
        "modified_time_ns": source_stat.st_mtime_ns,
    }


def edited_document(
    document: MoleculeDocument,
    atom_index: int,
    x: float,
    y: float,
    z: float,
) -> MoleculeDocument:
    return document.model_copy(
        update={
            "atoms": [
                atom.model_copy(update={"x": x, "y": y, "z": z})
                if atom.index == atom_index
                else atom
                for atom in document.atoms
            ],
        },
    )


def test_write_molecule_source_updates_xyz_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    shutil.copyfile(WATER_XYZ_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    edited = edited_document(document, atom_index=2, x=1.0, y=1.1, z=1.2)

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": edited.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    content = source_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert body["filename"] == "water.xyz"
    assert body["filetype"] == "xyz"
    assert body["path"] == str(source_path)
    assert body["bytes_written"] == len(content.encode("utf-8"))
    assert_response_source_matches_file(body["document"]["source"], source_path)
    assert lines[3].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_write_molecule_source_updates_gjf_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    edited = edited_document(document, atom_index=2, x=1.0, y=1.1, z=1.2)

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": edited.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    content = source_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert body["filename"] == "water.gjf"
    assert body["filetype"] == "gjf"
    assert body["path"] == str(source_path)
    assert body["bytes_written"] == len(content.encode("utf-8"))
    assert_response_source_matches_file(body["document"]["source"], source_path)
    assert lines[0] == "%chk=water.chk"
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[9].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_write_molecule_source_updates_com_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.com"
    shutil.copyfile(WATER_COM_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    edited = edited_document(document, atom_index=2, x=1.0, y=1.1, z=1.2)

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": edited.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    content = source_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert body["filename"] == "water.com"
    assert body["filetype"] == "com"
    assert body["path"] == str(source_path)
    assert body["bytes_written"] == len(content.encode("utf-8"))
    assert_response_source_matches_file(body["document"]["source"], source_path)
    assert lines[0] == "%chk=water.chk"
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[9].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_write_molecule_source_updates_gjf_frozen_atoms(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.gjf"
    shutil.copyfile(WATER_GJF_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    frozen_document = document.model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": frozen_document.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    lines = source_path.read_text(encoding="utf-8").splitlines()
    assert lines[8].split() == [
        "O",
        "-1",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert lines[9].split()[1] == "0"
    assert lines[10].split()[1] == "-1"


def test_write_molecule_source_updates_inp_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.inp"
    shutil.copyfile(WATER_INP_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    edited = edited_document(document, atom_index=1, x=2.0, y=2.1, z=2.2)

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": edited.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    content = source_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert body["filename"] == "water.inp"
    assert body["filetype"] == "inp"
    assert body["path"] == str(source_path)
    assert body["bytes_written"] == len(content.encode("utf-8"))
    assert_response_source_matches_file(body["document"]["source"], source_path)
    assert lines[0].split() == ["!", "hf", "def2-svp"]
    assert "* xyz 0 1" in lines
    assert [
        line.split()
        for line in lines
        if line.strip().startswith("O")
    ] == [
        [
            "O",
            "2.0000000000",
            "2.1000000000",
            "2.2000000000",
        ],
    ]


def test_write_molecule_source_updates_inp_frozen_atoms(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.inp"
    shutil.copyfile(WATER_INP_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    frozen_document = document.model_copy(
        update={"frozen_atom_indices": [1, 3]},
    )

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": frozen_document.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 200
    content = source_path.read_text(encoding="utf-8")
    assert "%geom" in content
    assert "{ C 0 C }" in content
    assert "{ C 2 C }" in content
    assert "{ C 1 C }" not in content


def test_write_molecule_source_requires_confirmation(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    original_content = WATER_XYZ_PATH.read_text(encoding="utf-8")
    source_path.write_text(original_content, encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": document.model_dump(),
            "confirmed": False,
        },
    )

    assert response.status_code == 400
    assert "requires explicit overwrite confirmation" in response.json()[
        "detail"
    ]
    assert source_path.read_text(encoding="utf-8") == original_content


def test_write_molecule_source_rejects_stale_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    original_content = WATER_XYZ_PATH.read_text(encoding="utf-8")
    source_path.write_text(original_content, encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(original_content + "\n", encoding="utf-8")

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": document.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 400
    assert "changed since this document was opened" in response.json()[
        "detail"
    ]
    assert source_path.read_text(encoding="utf-8") == original_content + "\n"


def test_write_molecule_source_rejects_output_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.log"
    original_content = WATER_LOG_PATH.read_text(encoding="utf-8")
    source_path.write_text(original_content, encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": document.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 400
    assert "not supported for calculation output files" in response.json()[
        "detail"
    ]
    assert source_path.read_text(encoding="utf-8") == original_content


def test_write_molecule_source_requires_revision_metadata() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_XYZ_PATH))
    assert document.source is not None
    document_without_revision = document.model_copy(
        update={
            "source": DocumentSource(
                path=document.source.path,
                filename=document.source.filename,
                filetype=document.source.filetype,
            ),
        },
    )

    response = client.post(
        "/api/documents/source-write",
        json={
            "document": document_without_revision.model_dump(),
            "confirmed": True,
        },
    )

    assert response.status_code == 400
    assert "requires source revision metadata" in response.json()["detail"]
