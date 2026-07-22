import shutil
from pathlib import Path

from fastapi.testclient import TestClient

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import DocumentSource
from chemsmart_gui.main import app


client = TestClient(app)
REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_XYZ_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"


def assert_source_matches_file(
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


def test_check_molecule_source_status_reports_current_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    shutil.copyfile(WATER_XYZ_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))

    response = client.post(
        "/api/documents/source-status",
        json={"document": document.model_dump()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "current"
    assert body["message"] == "Source file matches the opened revision."
    assert_source_matches_file(body["opened_source"], source_path)
    assert_source_matches_file(body["current_source"], source_path)


def test_check_molecule_source_status_reports_changed_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    original_content = WATER_XYZ_PATH.read_text(encoding="utf-8")
    source_path.write_text(original_content, encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(original_content + "\n", encoding="utf-8")

    response = client.post(
        "/api/documents/source-status",
        json={"document": document.model_dump()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "changed"
    assert body["message"].startswith(
        "Source file changed since this document was opened.",
    )
    assert body["opened_source"] == document.source.model_dump()
    assert_source_matches_file(body["current_source"], source_path)


def test_check_molecule_source_status_reports_missing_source(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "water.xyz"
    shutil.copyfile(WATER_XYZ_PATH, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.unlink()

    response = client.post(
        "/api/documents/source-status",
        json={"document": document.model_dump()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "missing"
    assert "no longer exists" in body["message"]
    assert body["opened_source"] == document.source.model_dump()
    assert body["current_source"] is None


def test_check_molecule_source_status_reports_untracked_document() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_XYZ_PATH))
    document_without_source = document.model_copy(update={"source": None})

    response = client.post(
        "/api/documents/source-status",
        json={"document": document_without_source.model_dump()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "status": "untracked",
        "message": "No source file is associated with this document.",
        "opened_source": None,
        "current_source": None,
    }


def test_check_molecule_source_status_reports_missing_revision() -> None:
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
        "/api/documents/source-status",
        json={"document": document_without_revision.model_dump()},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "untracked"
    assert "revision metadata is unavailable" in body["message"]
    assert body["opened_source"] == document_without_revision.source.model_dump()
    assert_source_matches_file(body["current_source"], WATER_XYZ_PATH)
