from fastapi import APIRouter, Depends, HTTPException, status

from chemsmart_gui.domain.document import MoleculeDocument, OpenDocumentRequest
from chemsmart_gui.domain.edit import (
    ApplyMoleculeEditRequest,
    MoleculeEditResponse,
)
from chemsmart_gui.services.chemsmart_document_service import (
    ChemsmartDocumentService,
)
from chemsmart_gui.services.document_service import DocumentService
from chemsmart_gui.services.molecule_edit_history import MoleculeEditHistory

router = APIRouter(prefix="/api/documents", tags=["documents"])

_document_service: DocumentService = ChemsmartDocumentService()


def get_document_service() -> DocumentService:
    return _document_service


@router.post("/open", response_model=MoleculeDocument)
def open_document(
    request: OpenDocumentRequest,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeDocument:
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


@router.get("/{document_id}", response_model=MoleculeDocument)
def get_document(
    document_id: str,
    document_service: DocumentService = Depends(get_document_service),
) -> MoleculeDocument:
    document = document_service.get_document(document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    return document
