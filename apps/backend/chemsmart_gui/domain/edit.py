from typing import Annotated, Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import MoleculeDocument

AtomIndex = Annotated[int, Field(ge=1)]


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


class SetAtomDistanceCommand(BaseModel):
    command_type: Literal["set_atom_distance"]
    document_id: str = Field(min_length=1)
    atom1_index: int = Field(ge=1)
    atom2_index: int = Field(ge=1)
    distance: float = Field(gt=0)
    coordinate_unit: Literal["angstrom"]


class SetAtomAngleCommand(BaseModel):
    command_type: Literal["set_atom_angle"]
    document_id: str = Field(min_length=1)
    atom1_index: int = Field(ge=1)
    vertex_atom_index: int = Field(ge=1)
    atom3_index: int = Field(ge=1)
    angle_degrees: float = Field(gt=0, lt=180)


class SetAtomDihedralCommand(BaseModel):
    command_type: Literal["set_atom_dihedral"]
    document_id: str = Field(min_length=1)
    atom1_index: int = Field(ge=1)
    atom2_index: int = Field(ge=1)
    atom3_index: int = Field(ge=1)
    atom4_index: int = Field(ge=1)
    dihedral_degrees: float = Field(ge=-180, le=180)


class AddBondCommand(BaseModel):
    command_type: Literal["add_bond"]
    document_id: str = Field(min_length=1)
    atom1_index: int = Field(ge=1)
    atom2_index: int = Field(ge=1)


class RemoveBondCommand(BaseModel):
    command_type: Literal["remove_bond"]
    document_id: str = Field(min_length=1)
    atom1_index: int = Field(ge=1)
    atom2_index: int = Field(ge=1)


class AddAtomCommand(BaseModel):
    command_type: Literal["add_atom"]
    document_id: str = Field(min_length=1)
    element: str = Field(min_length=1)
    position: CartesianPosition
    coordinate_unit: Literal["angstrom"]


class DeleteAtomsCommand(BaseModel):
    command_type: Literal["delete_atoms"]
    document_id: str = Field(min_length=1)
    atom_indices: list[AtomIndex] = Field(min_length=1)


MoleculeEditCommand = (
    SetAtomPositionCommand
    | SetAtomDistanceCommand
    | SetAtomAngleCommand
    | SetAtomDihedralCommand
    | AddBondCommand
    | RemoveBondCommand
    | AddAtomCommand
    | DeleteAtomsCommand
)


class ApplyMoleculeEditRequest(BaseModel):
    document: MoleculeDocument
    command: MoleculeEditCommand


class MoleculeEditResponse(BaseModel):
    document: MoleculeDocument
    can_undo: bool
    can_redo: bool
