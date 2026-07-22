from typing import Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import DocumentSource, MoleculeDocument

MoleculeExportFiletype = Literal["xyz", "gjf", "inp"]
MoleculeSourceWriteFiletype = Literal["xyz", "com", "gjf", "inp"]
MoleculeSourceStatusValue = Literal[
    "current",
    "changed",
    "missing",
    "untracked",
]


class MoleculeExportPreviewRequest(BaseModel):
    document: MoleculeDocument
    filetype: MoleculeExportFiletype


class MoleculeExportPreviewResponse(BaseModel):
    filename: str = Field(min_length=1)
    filetype: MoleculeExportFiletype
    content: str


class MoleculeExportWriteRequest(BaseModel):
    document: MoleculeDocument
    filetype: MoleculeExportFiletype
    target_path: str = Field(min_length=1)


class MoleculeExportWriteResponse(BaseModel):
    filename: str = Field(min_length=1)
    filetype: MoleculeExportFiletype
    path: str = Field(min_length=1)
    bytes_written: int = Field(ge=0)


class MoleculeSourceWriteRequest(BaseModel):
    document: MoleculeDocument
    confirmed: bool = False


class MoleculeSourceWriteResponse(BaseModel):
    document: MoleculeDocument
    filename: str = Field(min_length=1)
    filetype: MoleculeSourceWriteFiletype
    path: str = Field(min_length=1)
    bytes_written: int = Field(ge=0)


class MoleculeSourceStatusRequest(BaseModel):
    document: MoleculeDocument


class MoleculeSourceStatusResponse(BaseModel):
    status: MoleculeSourceStatusValue
    message: str = Field(min_length=1)
    opened_source: DocumentSource | None = None
    current_source: DocumentSource | None = None
