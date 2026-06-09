from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest
from chemsmart_gui.domain.molecule import Atom, Bond
from chemsmart_gui.services.document_service import DocumentService


class MockDocumentService(DocumentService):
    """In-memory mock implementation for initial MVP development."""

    def __init__(self) -> None:
        self._documents: dict[str, MoleculeDocument] = {}

    def open_document(self, request: OpenDocumentRequest) -> MoleculeDocument:
        document_id = request.document_id or "water"
        document = MoleculeDocument(
            id=document_id,
            name="Water",
            atoms=[
                Atom(index=0, element="O", x=0.0, y=0.0, z=0.0),
                Atom(index=1, element="H", x=0.76, y=0.58, z=0.0),
                Atom(index=2, element="H", x=-0.76, y=0.58, z=0.0),
            ],
            bonds=[
                Bond(atom1=0, atom2=1),
                Bond(atom1=0, atom2=2),
            ],
        )
        self._documents[document.id] = document
        return document

    def get_document(self, document_id: str) -> MoleculeDocument | None:
        return self._documents.get(document_id)
