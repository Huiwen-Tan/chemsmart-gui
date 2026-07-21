from typing import Literal

from pydantic import BaseModel, Field, model_validator

from .molecule import Atom, Bond

MoleculeDocumentKind = Literal["structure"]
TrajectoryDocumentKind = Literal["trajectory"]
CalculationResultDocumentKind = Literal["calculation_result"]
DocumentKind = (
    MoleculeDocumentKind
    | TrajectoryDocumentKind
    | CalculationResultDocumentKind
)
CalculationProgram = Literal["gaussian", "orca"]
JsonScalar = str | int | float | bool | None
JsonValue = JsonScalar | list[JsonScalar] | dict[str, JsonScalar]
JsonObject = dict[str, JsonValue]


class DocumentSource(BaseModel):
    path: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    filetype: str = Field(min_length=1)
    size_bytes: int | None = Field(default=None, ge=0)
    modified_time_ns: int | None = Field(default=None, ge=0)


class CalculationMetadata(BaseModel):
    program: CalculationProgram
    normal_termination: bool


class MoleculeDocument(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    document_kind: MoleculeDocumentKind
    source: DocumentSource | None
    calculation: CalculationMetadata | None
    coordinate_unit: Literal["angstrom"]
    charge: int | None
    multiplicity: int | None
    atoms: list[Atom]
    bonds: list[Bond]


class TrajectoryDocument(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    document_kind: TrajectoryDocumentKind
    source: DocumentSource | None
    calculation: CalculationMetadata | None
    coordinate_unit: Literal["angstrom"]
    frames: list[MoleculeDocument] = Field(min_length=1)
    frame_properties: list[dict[str, JsonScalar]]

    @model_validator(mode="after")
    def frame_properties_match_frames(self) -> "TrajectoryDocument":
        if len(self.frame_properties) != len(self.frames):
            raise ValueError(
                "frame_properties must contain one entry per trajectory frame"
            )
        return self


class CalculationResultDocument(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    document_kind: CalculationResultDocumentKind
    source: DocumentSource | None
    calculation: CalculationMetadata | None
    record_id: str = Field(min_length=1)
    meta: JsonObject
    results: JsonObject
    molecules: list[MoleculeDocument] = Field(min_length=1)
    provenance: JsonObject

    @model_validator(mode="after")
    def id_matches_record_id(self) -> "CalculationResultDocument":
        if self.id != self.record_id:
            raise ValueError("id must match record_id")
        return self


class OpenDocumentRequest(BaseModel):
    path: str | None = None
    document_id: str | None = None
