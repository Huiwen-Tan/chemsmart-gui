from fastapi import APIRouter, Depends, HTTPException, status

from chemsmart_gui.domain.document import OpenedDocument, OpenDocumentRequest
from chemsmart_gui.domain.displacement import (
    MoleculeModeDisplacementRequest,
    MoleculeModeDisplacementResponse,
)
from chemsmart_gui.domain.edit import (
    ApplyMoleculeEditRequest,
    MoleculeEditResponse,
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
from chemsmart_gui.domain.spectrum import (
    BroadenedIrSpectrumRequest,
    BroadenedIrSpectrumResponse,
)
from chemsmart_gui.services.chemsmart_document_service import (
    ChemsmartDocumentService,
)
from chemsmart_gui.services.document_service import DocumentService
from chemsmart_gui.services.ir_spectrum_service import IrSpectrumService
from chemsmart_gui.services.molecule_edit_history import MoleculeEditHistory

router = APIRouter(prefix="/api/documents", tags=["documents"])

_document_service: DocumentService = ChemsmartDocumentService()
_ir_spectrum_service = IrSpectrumService()


def get_document_service() -> DocumentService:
    return _document_service


@router.post("/open", response_model=OpenedDocument)
def open_document(
    request: OpenDocumentRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> OpenedDocument:
    try:
        return document_service.open_document(request)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/edit", response_model=MoleculeEditResponse)
def apply_document_edit(
    request: ApplyMoleculeEditRequest,
) -> MoleculeEditResponse:
    try:
        history = MoleculeEditHistory.start(request.document).apply(
            request.command,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return MoleculeEditResponse(
        document=history.current_document,
        can_undo=history.can_undo,
        can_redo=history.can_redo,
    )


@router.post("/export-preview", response_model=MoleculeExportPreviewResponse)
def preview_document_export(
    request: MoleculeExportPreviewRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeExportPreviewResponse:
    try:
        return document_service.preview_molecule_export(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/mode-displacement",
    response_model=MoleculeModeDisplacementResponse,
)
def generate_mode_displacement(
    request: MoleculeModeDisplacementRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeModeDisplacementResponse:
    try:
        return document_service.generate_mode_displacement(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/ir-spectrum-preview",
    response_model=BroadenedIrSpectrumResponse,
)
def preview_ir_spectrum(
    request: BroadenedIrSpectrumRequest,
) -> BroadenedIrSpectrumResponse:
    try:
        return _ir_spectrum_service.preview_broadened_ir_spectrum(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/export", response_model=MoleculeExportWriteResponse)
def write_document_export(
    request: MoleculeExportWriteRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeExportWriteResponse:
    try:
        return document_service.write_molecule_export(request)
    except FileExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/source-status", response_model=MoleculeSourceStatusResponse)
def check_document_source_status(
    request: MoleculeSourceStatusRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeSourceStatusResponse:
    return document_service.check_molecule_source_status(request)


@router.post("/source-write", response_model=MoleculeSourceWriteResponse)
def write_document_source(
    request: MoleculeSourceWriteRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeSourceWriteResponse:
    try:
        return document_service.write_molecule_source(request)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/{document_id}", response_model=OpenedDocument)
def get_document(
    document_id: str,
    document_service: DocumentService = Depends(get_document_service),
) -> OpenedDocument:
    document = document_service.get_document(document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    return document
