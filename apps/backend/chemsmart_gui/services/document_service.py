from abc import ABC, abstractmethod

from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest


class DocumentService(ABC):
    """Service abstraction for molecule document lifecycle operations."""

    @abstractmethod
    def open_document(self, request: OpenDocumentRequest) -> MoleculeDocument:
        """Open a molecular document and return a normalized molecule document."""

    @abstractmethod
    def get_document(self, document_id: str) -> MoleculeDocument | None:
        """Retrieve an existing molecule document by identifier."""
