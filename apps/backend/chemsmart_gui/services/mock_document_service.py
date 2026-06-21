from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest
from chemsmart_gui.domain.molecule import Atom, Bond
from chemsmart_gui.services.document_service import DocumentService


class MockDocumentService(DocumentService):
    """In-memory mock implementation for initial MVP development."""

    WATER_STRUCTURE_ID = (
        "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
    )

    def __init__(self) -> None:
        self._documents: dict[str, MoleculeDocument] = {}

    def open_document(self, request: OpenDocumentRequest) -> MoleculeDocument:
        document = MoleculeDocument(
            id=self.WATER_STRUCTURE_ID,
            name="str-H2O-102b86d02472",
            document_kind="structure",
            coordinate_unit="angstrom",
            charge=None,
            multiplicity=None,
            atoms=[
                Atom(index=1, element="O", x=0.0, y=0.0, z=0.0),
                Atom(index=2, element="H", x=0.76, y=0.58, z=0.0),
                Atom(index=3, element="H", x=-0.76, y=0.58, z=0.0),
            ],
            bonds=[
                Bond(atom1=1, atom2=2),
                Bond(atom1=1, atom2=3),
            ],
        )
        self._documents[document.id] = document
        return document

    def get_document(self, document_id: str) -> MoleculeDocument | None:
        return self._documents.get(document_id)
