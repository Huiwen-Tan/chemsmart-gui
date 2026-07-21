from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddAtomCommand,
    AddBondCommand,
    DeleteAtomsCommand,
    MoleculeEditCommand,
    RemoveBondCommand,
    SetAtomPositionCommand,
)
from chemsmart_gui.domain.molecule import Atom, Bond


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
        if isinstance(command, AddAtomCommand):
            return self._apply_add_atom(document, command)
        if isinstance(command, DeleteAtomsCommand):
            return self._apply_delete_atoms(document, command)

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
    def _validate_atom_indices(
        document: MoleculeDocument,
        atom_indices: list[int] | tuple[int, ...],
    ) -> None:
        if not atom_indices:
            raise ValueError("Atom edit requires at least one atom index.")

        existing_atom_indices = {atom.index for atom in document.atoms}
        missing_atoms = [
            atom_index
            for atom_index in atom_indices
            if atom_index not in existing_atom_indices
        ]
        if missing_atoms:
            missing_atom_list = ", ".join(
                str(index) for index in sorted(set(missing_atoms))
            )
            raise ValueError(
                f"Atom index {missing_atom_list} was not found in document "
                f"'{document.id}'."
            )

    @staticmethod
    def _validate_bond_atoms(
        document: MoleculeDocument,
        *,
        atom1_index: int,
        atom2_index: int,
    ) -> None:
        if atom1_index == atom2_index:
            raise ValueError("Bond edit requires two different atoms.")

        MoleculeEditService._validate_atom_indices(
            document,
            (atom1_index, atom2_index),
        )

    def _refresh_structure_document(
        self,
        document: MoleculeDocument,
        *,
        atoms: list[Atom],
        bonds: list[Bond],
    ) -> MoleculeDocument:
        edited_document = document.model_copy(
            update={
                "atoms": atoms,
                "bonds": bonds,
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
            update={"bonds": bonds},
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
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=document.bonds,
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

        return self._refresh_structure_document(
            document,
            atoms=document.atoms,
            bonds=[
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

        return self._refresh_structure_document(
            document,
            atoms=document.atoms,
            bonds=updated_bonds,
        )

    def _apply_add_atom(
        self,
        document: MoleculeDocument,
        command: AddAtomCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)

        element = command.element.strip()
        if not element:
            raise ValueError("Atom element is required.")

        next_index = max((atom.index for atom in document.atoms), default=0) + 1
        updated_atoms = [
            *document.atoms,
            Atom(
                index=next_index,
                element=element,
                x=command.position.x,
                y=command.position.y,
                z=command.position.z,
            ),
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=document.bonds,
        )

    def _apply_delete_atoms(
        self,
        document: MoleculeDocument,
        command: DeleteAtomsCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        atom_indices_to_delete = set(command.atom_indices)
        self._validate_atom_indices(document, command.atom_indices)
        if len(atom_indices_to_delete) >= len(document.atoms):
            raise ValueError("Cannot delete every atom from a molecule document.")

        old_to_new_index: dict[int, int] = {}
        updated_atoms: list[Atom] = []
        for atom in document.atoms:
            if atom.index in atom_indices_to_delete:
                continue
            new_index = len(updated_atoms) + 1
            old_to_new_index[atom.index] = new_index
            updated_atoms.append(atom.model_copy(update={"index": new_index}))

        updated_bonds = [
            Bond(
                atom1=old_to_new_index[bond.atom1],
                atom2=old_to_new_index[bond.atom2],
            )
            for bond in document.bonds
            if (
                bond.atom1 in old_to_new_index
                and bond.atom2 in old_to_new_index
            )
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=updated_bonds,
        )
