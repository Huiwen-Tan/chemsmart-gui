from typing import Literal

from pydantic import BaseModel, Field


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
