from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest
from chemsmart_gui.domain.export import (
    MoleculeExportPreviewRequest,
    MoleculeExportPreviewResponse,
)
from chemsmart_gui.services.document_service import DocumentService


class ChemsmartDocumentService(DocumentService):
    """Manage normalized documents opened through CHEMSMART."""

    def __init__(self, adapter: ChemsmartAdapter | None = None) -> None:
        self._adapter = adapter if adapter is not None else ChemsmartAdapter()
        self._documents: dict[str, MoleculeDocument] = {}

    def open_document(self, request: OpenDocumentRequest) -> MoleculeDocument:
        if request.path is None:
            raise ValueError("A document path is required.")

        document = self._adapter.open_molecule_from_path(request.path)
        self._documents[document.id] = document
        return document

    def get_document(self, document_id: str) -> MoleculeDocument | None:
        return self._documents.get(document_id)

    def preview_molecule_export(
        self,
        request: MoleculeExportPreviewRequest,
    ) -> MoleculeExportPreviewResponse:
        filename, content = self._adapter.preview_molecule_export(
            request.document,
            request.filetype,
        )
        return MoleculeExportPreviewResponse(
            filename=filename,
            filetype=request.filetype,
            content=content,
        )
