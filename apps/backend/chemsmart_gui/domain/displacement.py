from typing import Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import MoleculeDocument

ModeDisplacementDirection = Literal["positive", "negative"]


class MoleculeModeDisplacementRequest(BaseModel):
    document: MoleculeDocument
    mode_index: int = Field(ge=1)
    direction: ModeDisplacementDirection
    amplitude: float = Field(default=1.0, gt=0)


class MoleculeModeDisplacementResponse(BaseModel):
    document: MoleculeDocument
    mode_index: int = Field(ge=1)
    direction: ModeDisplacementDirection
    amplitude: float = Field(gt=0)
