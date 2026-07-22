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


class VibrationalDisplacement(BaseModel):
    atom_index: int = Field(ge=1)
    x: float
    y: float
    z: float


class VibrationalMode(BaseModel):
    index: int = Field(ge=1)
    frequency_cm_minus_1: float
    is_imaginary: bool
    reduced_mass_amu: float | None = None
    force_constant_mdyne_per_angstrom: float | None = None
    ir_intensity_km_per_mol: float | None = None
    symmetry: str | None = None
    displacements: list[VibrationalDisplacement] = Field(default_factory=list)
