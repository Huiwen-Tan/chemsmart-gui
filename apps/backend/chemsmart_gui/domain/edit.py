from typing import Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import MoleculeDocument


class CartesianPosition(BaseModel):
    x: float
    y: float
    z: float


class SetAtomPositionCommand(BaseModel):
    command_type: Literal["set_atom_position"]
    document_id: str = Field(min_length=1)
    atom_index: int = Field(ge=1)
    position: CartesianPosition
    coordinate_unit: Literal["angstrom"]


MoleculeEditCommand = SetAtomPositionCommand


class ApplyMoleculeEditRequest(BaseModel):
    document: MoleculeDocument
    command: MoleculeEditCommand


class MoleculeEditResponse(BaseModel):
    document: MoleculeDocument
    can_undo: bool
    can_redo: bool
