from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddBondCommand,
    MoleculeEditCommand,
    RemoveBondCommand,
    SetAtomPositionCommand,
)
from chemsmart_gui.domain.molecule import Bond


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
        if isinstance(command, AddBondCommand):
            return self._apply_add_bond(document, command)
        if isinstance(command, RemoveBondCommand):
            return self._apply_remove_bond(document, command)

        raise ValueError(
            f"Unsupported molecule edit command: {command.command_type}"
        )

    @staticmethod
    def _validate_document_id(
        document: MoleculeDocument,
        command: MoleculeEditCommand,
    ) -> None:
        if command.document_id != document.id:
            raise ValueError(
                "Edit command targets document "
                f"'{command.document_id}', but active document is "
                f"'{document.id}'."
            )

    @staticmethod
    def _bond_key(atom1_index: int, atom2_index: int) -> tuple[int, int]:
        return tuple(sorted((atom1_index, atom2_index)))

    @staticmethod
    def _validate_bond_atoms(
        document: MoleculeDocument,
        *,
        atom1_index: int,
        atom2_index: int,
    ) -> None:
        if atom1_index == atom2_index:
            raise ValueError("Bond edit requires two different atoms.")

        atom_indices = {atom.index for atom in document.atoms}
        missing_atoms = [
            atom_index
            for atom_index in (atom1_index, atom2_index)
            if atom_index not in atom_indices
        ]
        if missing_atoms:
            missing_atom_list = ", ".join(str(index) for index in missing_atoms)
            raise ValueError(
                f"Atom index {missing_atom_list} was not found in document "
                f"'{document.id}'."
            )

    def _document_with_bonds(
        self,
        document: MoleculeDocument,
        bonds: list[Bond],
    ) -> MoleculeDocument:
        return document.model_copy(
            update={
                "bonds": bonds,
                "calculation": None,
            },
            deep=True,
        )

    def _apply_set_atom_position(
        self,
        document: MoleculeDocument,
        command: SetAtomPositionCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)

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
        refreshed_document = self._adapter.to_document(
            molecule,
            source=document.source,
            calculation=None,
        )
        return refreshed_document.model_copy(
            update={"bonds": document.bonds},
            deep=True,
        )

    def _apply_add_bond(
        self,
        document: MoleculeDocument,
        command: AddBondCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        self._validate_bond_atoms(
            document,
            atom1_index=command.atom1_index,
            atom2_index=command.atom2_index,
        )

        target_key = self._bond_key(command.atom1_index, command.atom2_index)
        existing_bond_keys = {
            self._bond_key(bond.atom1, bond.atom2) for bond in document.bonds
        }
        if target_key in existing_bond_keys:
            raise ValueError(
                "Bond between atoms "
                f"{target_key[0]} and {target_key[1]} already exists."
            )

        return self._document_with_bonds(
            document,
            [
                *document.bonds,
                Bond(atom1=target_key[0], atom2=target_key[1]),
            ],
        )

    def _apply_remove_bond(
        self,
        document: MoleculeDocument,
        command: RemoveBondCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        self._validate_bond_atoms(
            document,
            atom1_index=command.atom1_index,
            atom2_index=command.atom2_index,
        )

        target_key = self._bond_key(command.atom1_index, command.atom2_index)
        updated_bonds = [
            bond
            for bond in document.bonds
            if self._bond_key(bond.atom1, bond.atom2) != target_key
        ]
        if len(updated_bonds) == len(document.bonds):
            raise ValueError(
                "Bond between atoms "
                f"{target_key[0]} and {target_key[1]} does not exist."
            )

        return self._document_with_bonds(document, updated_bonds)
