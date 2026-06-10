from typing import Literal

from pydantic import BaseModel, Field

from .molecule import Atom, Bond


class MoleculeDocument(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    coordinate_unit: Literal["angstrom"]
    charge: int | None
    multiplicity: int | None
    atoms: list[Atom]
    bonds: list[Bond]


class OpenDocumentRequest(BaseModel):
    path: str | None = None
    document_id: str | None = None
