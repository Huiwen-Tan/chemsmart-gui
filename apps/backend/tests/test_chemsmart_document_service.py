from pathlib import Path

import pytest

from chemsmart_gui.domain.document import OpenDocumentRequest
from chemsmart_gui.services.chemsmart_document_service import (
    ChemsmartDocumentService,
)


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
WATER_LOG_PATH = REPOSITORY_ROOT / "sample-data" / "water.log"


def test_open_document_caches_normalized_document() -> None:
    service = ChemsmartDocumentService()

    document = service.open_document(OpenDocumentRequest(path=str(WATER_PATH)))

    assert service.get_document(document.id) == document
    assert document.name == "str-H2O-102b86d02472"
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]


def test_open_document_caches_trajectory_document() -> None:
    service = ChemsmartDocumentService()

    document = service.open_document(
        OpenDocumentRequest(path=str(WATER_LOG_PATH)),
    )

    assert service.get_document(document.id) == document
    assert document.document_kind == "trajectory"
    assert len(document.frames) == 4


def test_open_document_requires_path() -> None:
    service = ChemsmartDocumentService()

    with pytest.raises(ValueError, match="document path is required"):
        service.open_document(OpenDocumentRequest())
