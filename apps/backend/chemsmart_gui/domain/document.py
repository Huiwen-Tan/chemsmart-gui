from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .molecule import Atom, Bond, VibrationalMode

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
AtomIndex = Annotated[int, Field(ge=1)]


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
    frozen_atom_indices: list[AtomIndex] = Field(default_factory=list)
    vibrational_modes: list[VibrationalMode] = Field(default_factory=list)

    @field_validator("frozen_atom_indices")
    @classmethod
    def frozen_atom_indices_are_unique(
        cls,
        atom_indices: list[int],
    ) -> list[int]:
        return sorted(set(atom_indices))

    @model_validator(mode="after")
    def frozen_atom_indices_reference_atoms(self) -> "MoleculeDocument":
        existing_atom_indices = {atom.index for atom in self.atoms}
        missing_atom_indices = [
            atom_index
            for atom_index in self.frozen_atom_indices
            if atom_index not in existing_atom_indices
        ]
        if missing_atom_indices:
            missing_atom_list = ", ".join(
                str(atom_index) for atom_index in missing_atom_indices
            )
            raise ValueError(
                "frozen_atom_indices reference missing atom indices: "
                f"{missing_atom_list}"
            )
        return self

    @model_validator(mode="after")
    def vibrational_modes_reference_atoms(self) -> "MoleculeDocument":
        existing_atom_indices = {atom.index for atom in self.atoms}
        for mode in self.vibrational_modes:
            if not mode.displacements:
                continue

            displacement_atom_indices = [
                displacement.atom_index
                for displacement in mode.displacements
            ]
            duplicate_indices = sorted(
                {
                    atom_index
                    for atom_index in displacement_atom_indices
                    if displacement_atom_indices.count(atom_index) > 1
                }
            )
            if duplicate_indices:
                duplicate_index_list = ", ".join(
                    str(atom_index) for atom_index in duplicate_indices
                )
                raise ValueError(
                    "vibrational mode displacements duplicate atom indices "
                    f"for mode {mode.index}: {duplicate_index_list}"
                )

            displacement_atom_index_set = set(displacement_atom_indices)
            missing_atoms = sorted(
                displacement_atom_index_set - existing_atom_indices
            )
            if missing_atoms:
                missing_atom_list = ", ".join(
                    str(atom_index) for atom_index in missing_atoms
                )
                raise ValueError(
                    "vibrational mode displacements reference missing atom "
                    f"indices for mode {mode.index}: {missing_atom_list}"
                )

            missing_displacements = sorted(
                existing_atom_indices - displacement_atom_index_set
            )
            if missing_displacements:
                missing_displacement_list = ", ".join(
                    str(atom_index) for atom_index in missing_displacements
                )
                raise ValueError(
                    "vibrational mode displacements omit atom indices for "
                    f"mode {mode.index}: {missing_displacement_list}"
                )

        return self


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
