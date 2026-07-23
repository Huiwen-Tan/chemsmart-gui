from typing import Literal

from pydantic import BaseModel, Field

from chemsmart_gui.domain.document import MoleculeDocument

IrSpectrumBroadening = Literal["gaussian", "lorentzian"]


class IrSpectrumPeak(BaseModel):
    mode_index: int = Field(ge=1)
    frequency_cm_minus_1: float
    ir_intensity_km_per_mol: float = Field(gt=0)


class IrSpectrumPoint(BaseModel):
    wavenumber_cm_minus_1: float
    intensity_km_per_mol: float = Field(ge=0)


class BroadenedIrSpectrumRequest(BaseModel):
    document: MoleculeDocument
    broadening: IrSpectrumBroadening = "gaussian"
    width_cm_minus_1: float = Field(default=20.0, gt=0)
    point_count: int = Field(default=201, ge=2, le=1000)


class BroadenedIrSpectrumResponse(BaseModel):
    broadening: IrSpectrumBroadening
    width_cm_minus_1: float = Field(gt=0)
    point_count: int = Field(ge=2)
    frequency_unit: Literal["cm^-1"] = "cm^-1"
    intensity_unit: Literal["km/mol"] = "km/mol"
    peaks: list[IrSpectrumPeak]
    points: list[IrSpectrumPoint]
