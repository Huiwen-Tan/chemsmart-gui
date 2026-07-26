from abc import ABC, abstractmethod

from chemsmart_gui.domain.document import OpenedDocument, OpenDocumentRequest
from chemsmart_gui.domain.displacement import (
    MoleculeModeDisplacementRequest,
    MoleculeModeDisplacementResponse,
)
from chemsmart_gui.domain.export import (
    MoleculeExportPreviewRequest,
    MoleculeExportPreviewResponse,
    MoleculeExportWriteRequest,
    MoleculeExportWriteResponse,
    MoleculeSourceStatusRequest,
    MoleculeSourceStatusResponse,
    MoleculeSourceWriteRequest,
    MoleculeSourceWriteResponse,
)


class DocumentService(ABC):
    """Service abstraction for molecule document lifecycle operations."""

    @abstractmethod
    def open_document(self, request: OpenDocumentRequest) -> OpenedDocument:
        """Open a molecular document and return normalized data."""

    @abstractmethod
    def import_document(
        self,
        filename: str,
        content: bytes,
    ) -> OpenedDocument:
        """Import uploaded document content without tracking a source path."""

    @abstractmethod
    def get_document(self, document_id: str) -> OpenedDocument | None:
        """Retrieve an existing molecule document by identifier."""

    @abstractmethod
    def preview_molecule_export(
        self,
        request: MoleculeExportPreviewRequest,
    ) -> MoleculeExportPreviewResponse:
        """Preview a molecule document export without writing user files."""

    @abstractmethod
    def generate_mode_displacement(
        self,
        request: MoleculeModeDisplacementRequest,
    ) -> MoleculeModeDisplacementResponse:
        """Generate a new structure from a selected vibrational mode."""

    @abstractmethod
    def write_molecule_export(
        self,
        request: MoleculeExportWriteRequest,
    ) -> MoleculeExportWriteResponse:
        """Write a molecule export to a new target file."""

    @abstractmethod
    def check_molecule_source_status(
        self,
        request: MoleculeSourceStatusRequest,
    ) -> MoleculeSourceStatusResponse:
        """Check whether a document source still matches opened metadata."""

    @abstractmethod
    def write_molecule_source(
        self,
        request: MoleculeSourceWriteRequest,
    ) -> MoleculeSourceWriteResponse:
        """Write a molecule document back to its existing source file."""
