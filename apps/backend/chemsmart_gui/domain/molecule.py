from pydantic import BaseModel, Field


class Atom(BaseModel):
    index: int = Field(ge=1)
    element: str = Field(min_length=1)
    x: float
    y: float
    z: float


class Bond(BaseModel):
    atom1: int = Field(ge=1)
    atom2: int = Field(ge=1)
