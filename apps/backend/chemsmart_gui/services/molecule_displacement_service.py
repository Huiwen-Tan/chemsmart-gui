"""Generate structure documents from vibrational-mode displacements."""

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.displacement import (
    ModeDisplacementDirection,
    MoleculeModeDisplacementRequest,
    MoleculeModeDisplacementResponse,
)
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.molecule import (
    Atom,
    VibrationalDisplacement,
    VibrationalMode,
)


def _direction_scale(direction: ModeDisplacementDirection) -> float:
    if direction == "positive":
        return 1.0
    if direction == "negative":
        return -1.0

    raise ValueError(f"Unsupported displacement direction: {direction}.")


class MoleculeDisplacementService:
    """Apply normalized vibrational displacements to molecule documents."""

    def __init__(self, adapter: ChemsmartAdapter | None = None) -> None:
        self._adapter = adapter or ChemsmartAdapter()

    def generate_mode_displacement(
        self,
        request: MoleculeModeDisplacementRequest,
    ) -> MoleculeModeDisplacementResponse:
        mode = self._mode_by_index(request.document, request.mode_index)
        if not mode.displacements:
            raise ValueError(
                f"Vibrational mode {request.mode_index} has no displacement "
                "vectors."
            )

        scale = _direction_scale(request.direction) * request.amplitude
        displacement_by_atom_index = {
            displacement.atom_index: displacement
            for displacement in mode.displacements
        }
        displaced_atoms = [
            self._displaced_atom(
                atom,
                displacement_by_atom_index[atom.index],
                scale,
            )
            for atom in request.document.atoms
        ]
        generated_document = self._refresh_generated_document(
            request.document,
            atoms=displaced_atoms,
        )
        return MoleculeModeDisplacementResponse(
            document=generated_document,
            mode_index=request.mode_index,
            direction=request.direction,
            amplitude=request.amplitude,
        )

    @staticmethod
    def _mode_by_index(
        document: MoleculeDocument,
        mode_index: int,
    ) -> VibrationalMode:
        for mode in document.vibrational_modes:
            if mode.index == mode_index:
                return mode

        raise ValueError(
            f"Vibrational mode {mode_index} was not found in document "
            f"'{document.id}'."
        )

    @staticmethod
    def _displaced_atom(
        atom: Atom,
        displacement: VibrationalDisplacement,
        scale: float,
    ) -> Atom:
        return atom.model_copy(
            update={
                "x": atom.x + displacement.x * scale,
                "y": atom.y + displacement.y * scale,
                "z": atom.z + displacement.z * scale,
            },
        )

    def _refresh_generated_document(
        self,
        document: MoleculeDocument,
        *,
        atoms: list[Atom],
    ) -> MoleculeDocument:
        displaced_document = document.model_copy(
            update={
                "atoms": atoms,
                "source": None,
                "calculation": None,
                "vibrational_modes": [],
            },
            deep=True,
        )
        molecule = self._adapter.to_molecule(displaced_document)
        refreshed_document = self._adapter.to_document(molecule)
        return refreshed_document.model_copy(
            update={
                "bonds": document.bonds,
                "frozen_atom_indices": document.frozen_atom_indices,
                "vibrational_modes": [],
            },
            deep=True,
        )
