from pathlib import Path

from chemsmart_gui.domain.document import (
    DocumentSource,
    MoleculeDocument,
    OpenDocumentRequest,
)
from chemsmart_gui.domain.export import (
    MoleculeExportPreviewRequest,
    MoleculeExportPreviewResponse,
)
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
        source_path = Path(request.path or "sample-data/water.xyz")
        document = MoleculeDocument(
            id=self.WATER_STRUCTURE_ID,
            name="str-H2O-102b86d02472",
            document_kind="structure",
            source=DocumentSource(
                path=str(source_path),
                filename=source_path.name,
                filetype=source_path.suffix.lower().removeprefix(".") or "xyz",
            ),
            calculation=None,
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

    def preview_molecule_export(
        self,
        request: MoleculeExportPreviewRequest,
    ) -> MoleculeExportPreviewResponse:
        lines = [
            str(len(request.document.atoms)),
            f"{request.document.name}    Empirical formula: unavailable",
            *(
                f"{atom.element:5} {atom.x:15.10f} "
                f"{atom.y:15.10f} {atom.z:15.10f}"
                for atom in request.document.atoms
            ),
        ]
        return MoleculeExportPreviewResponse(
            filename=f"{request.document.name}.xyz",
            filetype=request.filetype,
            content="\n".join(lines) + "\n",
        )
