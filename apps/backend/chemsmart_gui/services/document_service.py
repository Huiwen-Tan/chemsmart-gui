from abc import ABC, abstractmethod

from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest
from chemsmart_gui.domain.export import (
    MoleculeExportPreviewRequest,
    MoleculeExportPreviewResponse,
)


class DocumentService(ABC):
    """Service abstraction for molecule document lifecycle operations."""

    @abstractmethod
    def open_document(self, request: OpenDocumentRequest) -> MoleculeDocument:
        """Open a molecular document and return normalized data."""

    @abstractmethod
    def get_document(self, document_id: str) -> MoleculeDocument | None:
        """Retrieve an existing molecule document by identifier."""

    @abstractmethod
    def preview_molecule_export(
        self,
        request: MoleculeExportPreviewRequest,
    ) -> MoleculeExportPreviewResponse:
        """Preview a molecule document export without writing user files."""
