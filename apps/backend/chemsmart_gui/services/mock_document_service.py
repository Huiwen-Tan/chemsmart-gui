from pathlib import Path

from chemsmart_gui.domain.document import (
    DocumentSource,
    MoleculeDocument,
    OpenDocumentRequest,
)
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
from chemsmart_gui.domain.molecule import Atom, Bond
from chemsmart_gui.services.document_service import DocumentService
from chemsmart_gui.services.export_writer import (
    validate_export_target,
    write_export_text,
)
from chemsmart_gui.services.molecule_displacement_service import (
    MoleculeDisplacementService,
)


class MockDocumentService(DocumentService):
    """In-memory mock implementation for initial MVP development."""

    WATER_STRUCTURE_ID = (
        "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
    )

    def __init__(self) -> None:
        self._displacement_service = MoleculeDisplacementService()
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
        if request.filetype != "xyz":
            raise ValueError("Mock export preview supports only xyz.")

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

    def generate_mode_displacement(
        self,
        request: MoleculeModeDisplacementRequest,
    ) -> MoleculeModeDisplacementResponse:
        response = self._displacement_service.generate_mode_displacement(
            request,
        )
        self._documents[response.document.id] = response.document
        return response

    def write_molecule_export(
        self,
        request: MoleculeExportWriteRequest,
    ) -> MoleculeExportWriteResponse:
        validate_export_target(request.target_path, request.filetype)
        preview = self.preview_molecule_export(
            MoleculeExportPreviewRequest(
                document=request.document,
                filetype=request.filetype,
            ),
        )
        return write_export_text(
            target_path=request.target_path,
            filetype=request.filetype,
            content=preview.content,
        )

    def write_molecule_source(
        self,
        request: MoleculeSourceWriteRequest,
    ) -> MoleculeSourceWriteResponse:
        if not request.confirmed:
            raise ValueError(
                "Source write-back requires explicit overwrite confirmation."
            )
        if request.document.source is None:
            raise ValueError("Source write-back requires an existing source.")

        preview = self.preview_molecule_export(
            MoleculeExportPreviewRequest(
                document=request.document,
                filetype="xyz",
            ),
        )
        source_path = Path(request.document.source.path)
        source_path.write_text(preview.content, encoding="utf-8")
        source_stat = source_path.stat()
        updated_document = request.document.model_copy(
            update={
                "source": DocumentSource(
                    path=str(source_path),
                    filename=source_path.name,
                    filetype=(
                        source_path.suffix.lower().removeprefix(".") or "xyz"
                    ),
                    size_bytes=source_stat.st_size,
                    modified_time_ns=source_stat.st_mtime_ns,
                ),
            },
        )
        self._documents[updated_document.id] = updated_document
        return MoleculeSourceWriteResponse(
            document=updated_document,
            filename=source_path.name,
            filetype="xyz",
            path=str(source_path),
            bytes_written=len(preview.content.encode("utf-8")),
        )

    def check_molecule_source_status(
        self,
        request: MoleculeSourceStatusRequest,
    ) -> MoleculeSourceStatusResponse:
        source = request.document.source
        if source is None:
            return MoleculeSourceStatusResponse(
                status="untracked",
                message="No source file is associated with this document.",
            )

        source_path = Path(source.path)
        if not source_path.exists():
            return MoleculeSourceStatusResponse(
                status="missing",
                message="Source file no longer exists.",
                opened_source=source,
            )

        source_stat = source_path.stat()
        current_source = DocumentSource(
            path=str(source_path),
            filename=source_path.name,
            filetype=source_path.suffix.lower().removeprefix(".") or "xyz",
            size_bytes=source_stat.st_size,
            modified_time_ns=source_stat.st_mtime_ns,
        )
        if (
            source.size_bytes == current_source.size_bytes
            and source.modified_time_ns == current_source.modified_time_ns
        ):
            return MoleculeSourceStatusResponse(
                status="current",
                message="Source file matches the opened revision.",
                opened_source=source,
                current_source=current_source,
            )

        return MoleculeSourceStatusResponse(
            status="changed",
            message="Source file changed since this document was opened.",
            opened_source=source,
            current_source=current_source,
        )
