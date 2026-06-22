from typing import Literal

from pydantic import BaseModel, Field

from .molecule import Atom, Bond

DocumentKind = Literal["structure"]


class DocumentSource(BaseModel):
    path: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    filetype: str = Field(min_length=1)


class MoleculeDocument(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    document_kind: DocumentKind
    source: DocumentSource | None
    coordinate_unit: Literal["angstrom"]
    charge: int | None
    multiplicity: int | None
    atoms: list[Atom]
    bonds: list[Bond]


class OpenDocumentRequest(BaseModel):
    path: str | None = None
    document_id: str | None = None
