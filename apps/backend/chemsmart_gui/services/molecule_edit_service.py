from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import MoleculeEditCommand, SetAtomPositionCommand


class MoleculeEditService:
    """Apply molecule edit commands to normalized backend documents."""

    def __init__(self, adapter: ChemsmartAdapter | None = None) -> None:
        self._adapter = adapter or ChemsmartAdapter()

    def apply_command(
        self,
        document: MoleculeDocument,
        command: MoleculeEditCommand,
    ) -> MoleculeDocument:
        if isinstance(command, SetAtomPositionCommand):
            return self._apply_set_atom_position(document, command)

        raise ValueError(
            f"Unsupported molecule edit command: {command.command_type}"
        )

    def _apply_set_atom_position(
        self,
        document: MoleculeDocument,
        command: SetAtomPositionCommand,
    ) -> MoleculeDocument:
        if command.document_id != document.id:
            raise ValueError(
                "Edit command targets document "
                f"'{command.document_id}', but active document is "
                f"'{document.id}'."
            )

        target_atom = next(
            (atom for atom in document.atoms if atom.index == command.atom_index),
            None,
        )
        if target_atom is None:
            raise ValueError(
                f"Atom index {command.atom_index} was not found in document "
                f"'{document.id}'."
            )

        updated_atoms = [
            atom.model_copy(
                update={
                    "x": command.position.x,
                    "y": command.position.y,
                    "z": command.position.z,
                }
            )
            if atom.index == command.atom_index
            else atom
            for atom in document.atoms
        ]
        edited_document = document.model_copy(
            update={
                "atoms": updated_atoms,
                "calculation": None,
            },
            deep=True,
        )
        molecule = self._adapter.to_molecule(edited_document)
        return self._adapter.to_document(
            molecule,
            source=document.source,
            calculation=None,
        )
