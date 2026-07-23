from pathlib import Path
from typing import cast

from chemsmart_gui.adapters.chemsmart_adapter import (
    ChemsmartAdapter,
    document_source_from_path,
)
from chemsmart_gui.domain.document import (
    MoleculeDocument,
    OpenedDocument,
    OpenDocumentRequest,
)
from chemsmart_gui.domain.displacement import (
    MoleculeModeDisplacementRequest,
    MoleculeModeDisplacementResponse,
)
from chemsmart_gui.domain.export import (
    MoleculeExportFiletype,
    MoleculeExportPreviewRequest,
    MoleculeExportPreviewResponse,
    MoleculeExportWriteRequest,
    MoleculeExportWriteResponse,
    MoleculeSourceWriteFiletype,
    MoleculeSourceStatusRequest,
    MoleculeSourceStatusResponse,
    MoleculeSourceWriteRequest,
    MoleculeSourceWriteResponse,
)
from chemsmart_gui.services.document_service import DocumentService
from chemsmart_gui.services.export_writer import (
    validate_export_target,
    validate_source_revision,
    write_export_text,
    write_source_text,
)
from chemsmart_gui.services.molecule_displacement_service import (
    MoleculeDisplacementService,
)

SOURCE_WRITE_EXPORT_FILETYPES: dict[
    MoleculeSourceWriteFiletype,
    MoleculeExportFiletype,
] = {
    "xyz": "xyz",
    "com": "com",
    "gjf": "gjf",
    "inp": "inp",
}
READ_ONLY_SOURCE_FILETYPES = {"log", "out"}


class ChemsmartDocumentService(DocumentService):
    """Manage normalized documents opened through CHEMSMART."""

    def __init__(self, adapter: ChemsmartAdapter | None = None) -> None:
        self._adapter = adapter if adapter is not None else ChemsmartAdapter()
        self._displacement_service = MoleculeDisplacementService(self._adapter)
        self._documents: dict[str, OpenedDocument] = {}

    def open_document(self, request: OpenDocumentRequest) -> OpenedDocument:
        if request.path is None:
            raise ValueError("A document path is required.")

        document = self._adapter.open_document_from_path(request.path)
        self._documents[document.id] = document
        return document

    def get_document(self, document_id: str) -> OpenedDocument | None:
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
        _, content = self._adapter.preview_molecule_export(
            request.document,
            request.filetype,
        )
        return write_export_text(
            target_path=request.target_path,
            filetype=request.filetype,
            content=content,
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
                message=(
                    "Source file no longer exists. Reopen the source file "
                    "before writing source changes."
                ),
                opened_source=source,
            )

        current_source = document_source_from_path(str(source_path))
        if source.size_bytes is None or source.modified_time_ns is None:
            return MoleculeSourceStatusResponse(
                status="untracked",
                message=(
                    "Source revision metadata is unavailable. Reopen the "
                    "source file and try again."
                ),
                opened_source=source,
                current_source=current_source,
            )

        if (
            current_source.size_bytes != source.size_bytes
            or current_source.modified_time_ns != source.modified_time_ns
        ):
            return MoleculeSourceStatusResponse(
                status="changed",
                message=(
                    "Source file changed since this document was opened. "
                    "Reopen the source file before writing source changes."
                ),
                opened_source=source,
                current_source=current_source,
            )

        return MoleculeSourceStatusResponse(
            status="current",
            message="Source file matches the opened revision.",
            opened_source=source,
            current_source=current_source,
        )

    def _source_writeback_target(
        self,
        document: MoleculeDocument,
    ) -> tuple[Path, MoleculeSourceWriteFiletype, MoleculeExportFiletype]:
        if document.source is None:
            raise ValueError("Source write-back requires an existing source.")

        source_path = Path(document.source.path)
        if not source_path.exists():
            raise FileNotFoundError(
                f"Source file for write-back does not exist: "
                f"{document.source.path}"
            )

        source_filetype = source_path.suffix.lower().removeprefix(".")
        if source_filetype in READ_ONLY_SOURCE_FILETYPES:
            raise ValueError(
                "Source write-back is not supported for calculation output "
                f"files: .{source_filetype}."
            )
        if source_filetype not in SOURCE_WRITE_EXPORT_FILETYPES:
            raise ValueError(
                f"Source write-back is not supported for .{source_filetype} "
                "source files."
            )

        source_write_filetype = cast(
            MoleculeSourceWriteFiletype, source_filetype
        )
        validate_source_revision(document, source_path)
        return (
            source_path,
            source_write_filetype,
            SOURCE_WRITE_EXPORT_FILETYPES[source_write_filetype],
        )

    def write_molecule_source(
        self,
        request: MoleculeSourceWriteRequest,
    ) -> MoleculeSourceWriteResponse:
        if not request.confirmed:
            raise ValueError(
                "Source write-back requires explicit overwrite confirmation."
            )

        source_path, source_filetype, export_filetype = (
            self._source_writeback_target(request.document)
        )
        _, content = self._adapter.preview_molecule_export(
            request.document,
            export_filetype,
        )
        bytes_written = write_source_text(
            source_path=source_path,
            content=content,
        )
        updated_document = request.document.model_copy(
            update={"source": document_source_from_path(str(source_path))},
        )
        self._documents[updated_document.id] = updated_document

        return MoleculeSourceWriteResponse(
            document=updated_document,
            filename=source_path.name,
            filetype=source_filetype,
            path=str(source_path),
            bytes_written=bytes_written,
        )
