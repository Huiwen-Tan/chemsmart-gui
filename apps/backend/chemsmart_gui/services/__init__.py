"""Service interfaces and implementations."""

from .document_service import DocumentService
from .mock_document_service import MockDocumentService

__all__ = ["DocumentService", "MockDocumentService"]
