from typing import Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import MoleculeDocument

MoleculeExportFiletype = Literal["xyz", "gjf", "inp"]


class MoleculeExportPreviewRequest(BaseModel):
    document: MoleculeDocument
    filetype: MoleculeExportFiletype


class MoleculeExportPreviewResponse(BaseModel):
    filename: str = Field(min_length=1)
    filetype: MoleculeExportFiletype
    content: str
