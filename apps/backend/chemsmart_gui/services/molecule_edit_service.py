import math

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import (
    AddAtomCommand,
    AddBondCommand,
    DeleteAtomsCommand,
    MoleculeEditCommand,
    RemoveBondCommand,
    SetAtomAngleCommand,
    SetAtomDihedralCommand,
    SetAtomDistanceCommand,
    SetAtomPositionCommand,
    SetFrozenAtomsCommand,
)
from chemsmart_gui.domain.molecule import Atom, Bond

GEOMETRY_EPSILON = 1e-12
Vector3 = tuple[float, float, float]


def _atom_position(atom: Atom) -> Vector3:
    return (atom.x, atom.y, atom.z)


def _subtract_vectors(first: Vector3, second: Vector3) -> Vector3:
    return (
        first[0] - second[0],
        first[1] - second[1],
        first[2] - second[2],
    )


def _subtract_atom_positions(first: Atom, second: Atom) -> Vector3:
    return _subtract_vectors(_atom_position(first), _atom_position(second))


def _add_vectors(first: Vector3, second: Vector3) -> Vector3:
    return (
        first[0] + second[0],
        first[1] + second[1],
        first[2] + second[2],
    )


def _scale_vector(vector: Vector3, scale: float) -> Vector3:
    return (
        vector[0] * scale,
        vector[1] * scale,
        vector[2] * scale,
    )


def _dot_vectors(first: Vector3, second: Vector3) -> float:
    return (
        first[0] * second[0]
        + first[1] * second[1]
        + first[2] * second[2]
    )


def _cross_vectors(first: Vector3, second: Vector3) -> Vector3:
    return (
        first[1] * second[2] - first[2] * second[1],
        first[2] * second[0] - first[0] * second[2],
        first[0] * second[1] - first[1] * second[0],
    )


def _vector_length(vector: Vector3) -> float:
    return math.sqrt(_dot_vectors(vector, vector))


def _normalize_vector(vector: Vector3) -> Vector3 | None:
    length = _vector_length(vector)
    if length <= GEOMETRY_EPSILON:
        return None

    return _scale_vector(vector, 1 / length)


def _orthogonal_component(vector: Vector3, axis_unit: Vector3) -> Vector3:
    return _subtract_vectors(
        vector,
        _scale_vector(axis_unit, _dot_vectors(vector, axis_unit)),
    )


def _calculate_dihedral_degrees(
    first_atom: Atom,
    second_atom: Atom,
    third_atom: Atom,
    fourth_atom: Atom,
) -> float | None:
    first_bond = _subtract_atom_positions(first_atom, second_atom)
    second_bond = _subtract_atom_positions(third_atom, second_atom)
    third_bond = _subtract_atom_positions(fourth_atom, third_atom)
    second_bond_unit = _normalize_vector(second_bond)
    if second_bond_unit is None:
        return None

    first_plane_vector = _orthogonal_component(
        first_bond,
        second_bond_unit,
    )
    second_plane_vector = _orthogonal_component(
        third_bond,
        second_bond_unit,
    )
    if (
        _vector_length(first_plane_vector) <= GEOMETRY_EPSILON
        or _vector_length(second_plane_vector) <= GEOMETRY_EPSILON
    ):
        return None

    x_value = _dot_vectors(first_plane_vector, second_plane_vector)
    y_value = _dot_vectors(
        _cross_vectors(second_bond_unit, first_plane_vector),
        second_plane_vector,
    )
    return math.degrees(math.atan2(y_value, x_value))


def _normalize_rotation_degrees(rotation_degrees: float) -> float:
    return (rotation_degrees + 180) % 360 - 180


def _rotate_vector_around_axis(
    vector: Vector3,
    axis_unit: Vector3,
    rotation_radians: float,
) -> Vector3:
    cos_value = math.cos(rotation_radians)
    sin_value = math.sin(rotation_radians)
    cross_component = _cross_vectors(axis_unit, vector)
    axis_component = _scale_vector(
        axis_unit,
        _dot_vectors(axis_unit, vector) * (1 - cos_value),
    )
    return _add_vectors(
        _add_vectors(
            _scale_vector(vector, cos_value),
            _scale_vector(cross_component, sin_value),
        ),
        axis_component,
    )


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
        if isinstance(command, SetAtomDistanceCommand):
            return self._apply_set_atom_distance(document, command)
        if isinstance(command, SetAtomAngleCommand):
            return self._apply_set_atom_angle(document, command)
        if isinstance(command, SetAtomDihedralCommand):
            return self._apply_set_atom_dihedral(document, command)
        if isinstance(command, SetFrozenAtomsCommand):
            return self._apply_set_frozen_atoms(document, command)
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
    def _atom_by_index(document: MoleculeDocument, atom_index: int) -> Atom:
        for atom in document.atoms:
            if atom.index == atom_index:
                return atom

        raise ValueError(
            f"Atom index {atom_index} was not found in document "
            f"'{document.id}'."
        )

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
        frozen_atom_indices: list[int] | None = None,
    ) -> MoleculeDocument:
        updated_frozen_atom_indices = (
            document.frozen_atom_indices
            if frozen_atom_indices is None
            else frozen_atom_indices
        )
        edited_document = document.model_copy(
            update={
                "atoms": atoms,
                "bonds": bonds,
                "calculation": None,
                "frozen_atom_indices": updated_frozen_atom_indices,
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
            update={
                "bonds": bonds,
                "frozen_atom_indices": updated_frozen_atom_indices,
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
            (
                atom
                for atom in document.atoms
                if atom.index == command.atom_index
            ),
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

    def _apply_set_atom_distance(
        self,
        document: MoleculeDocument,
        command: SetAtomDistanceCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        if command.atom1_index == command.atom2_index:
            raise ValueError("Distance edit requires two different atoms.")
        self._validate_atom_indices(
            document,
            (command.atom1_index, command.atom2_index),
        )

        first_atom = self._atom_by_index(document, command.atom1_index)
        second_atom = self._atom_by_index(document, command.atom2_index)
        delta = _subtract_atom_positions(second_atom, first_atom)
        current_distance = _vector_length(delta)
        if current_distance <= GEOMETRY_EPSILON:
            raise ValueError(
                "Cannot set atom distance when the current atom positions "
                "are degenerate."
            )

        scale = command.distance / current_distance
        target_delta = _scale_vector(delta, scale)
        updated_second_atom = second_atom.model_copy(
            update={
                "x": first_atom.x + target_delta[0],
                "y": first_atom.y + target_delta[1],
                "z": first_atom.z + target_delta[2],
            }
        )
        updated_atoms = [
            updated_second_atom if atom.index == command.atom2_index else atom
            for atom in document.atoms
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=document.bonds,
        )

    def _apply_set_atom_angle(
        self,
        document: MoleculeDocument,
        command: SetAtomAngleCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        atom_indices = (
            command.atom1_index,
            command.vertex_atom_index,
            command.atom3_index,
        )
        if len(set(atom_indices)) != 3:
            raise ValueError("Angle edit requires three different atoms.")
        self._validate_atom_indices(document, atom_indices)

        first_atom = self._atom_by_index(document, command.atom1_index)
        vertex_atom = self._atom_by_index(document, command.vertex_atom_index)
        third_atom = self._atom_by_index(document, command.atom3_index)
        first_vector = _subtract_atom_positions(first_atom, vertex_atom)
        third_vector = _subtract_atom_positions(third_atom, vertex_atom)
        first_unit = _normalize_vector(first_vector)
        third_unit = _normalize_vector(third_vector)
        if first_unit is None or third_unit is None:
            raise ValueError(
                "Cannot set atom angle when the current atom positions "
                "are degenerate."
            )

        plane_normal = _normalize_vector(
            _cross_vectors(first_unit, third_unit)
        )
        if plane_normal is None:
            raise ValueError(
                "Cannot set atom angle when the current angle plane is "
                "degenerate."
            )

        perpendicular_unit = _normalize_vector(
            _cross_vectors(plane_normal, first_unit)
        )
        if perpendicular_unit is None:
            raise ValueError(
                "Cannot set atom angle when the current angle plane is "
                "degenerate."
            )

        target_angle = math.radians(command.angle_degrees)
        target_unit = _add_vectors(
            _scale_vector(first_unit, math.cos(target_angle)),
            _scale_vector(perpendicular_unit, math.sin(target_angle)),
        )
        target_vector = _scale_vector(
            target_unit,
            _vector_length(third_vector),
        )
        updated_third_atom = third_atom.model_copy(
            update={
                "x": vertex_atom.x + target_vector[0],
                "y": vertex_atom.y + target_vector[1],
                "z": vertex_atom.z + target_vector[2],
            }
        )
        updated_atoms = [
            updated_third_atom if atom.index == command.atom3_index else atom
            for atom in document.atoms
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=document.bonds,
        )

    def _apply_set_atom_dihedral(
        self,
        document: MoleculeDocument,
        command: SetAtomDihedralCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        atom_indices = (
            command.atom1_index,
            command.atom2_index,
            command.atom3_index,
            command.atom4_index,
        )
        if len(set(atom_indices)) != 4:
            raise ValueError("Dihedral edit requires four different atoms.")
        self._validate_atom_indices(document, atom_indices)

        first_atom = self._atom_by_index(document, command.atom1_index)
        second_atom = self._atom_by_index(document, command.atom2_index)
        third_atom = self._atom_by_index(document, command.atom3_index)
        fourth_atom = self._atom_by_index(document, command.atom4_index)
        axis = _subtract_atom_positions(third_atom, second_atom)
        axis_unit = _normalize_vector(axis)
        if axis_unit is None:
            raise ValueError(
                "Cannot set atom dihedral when the central bond is "
                "degenerate."
            )

        current_dihedral = _calculate_dihedral_degrees(
            first_atom,
            second_atom,
            third_atom,
            fourth_atom,
        )
        if current_dihedral is None:
            raise ValueError(
                "Cannot set atom dihedral when the current dihedral is "
                "degenerate."
            )

        rotation_degrees = _normalize_rotation_degrees(
            command.dihedral_degrees - current_dihedral
        )
        fourth_vector = _subtract_atom_positions(fourth_atom, third_atom)
        rotated_fourth_vector = _rotate_vector_around_axis(
            fourth_vector,
            axis_unit,
            math.radians(rotation_degrees),
        )
        updated_fourth_atom = fourth_atom.model_copy(
            update={
                "x": third_atom.x + rotated_fourth_vector[0],
                "y": third_atom.y + rotated_fourth_vector[1],
                "z": third_atom.z + rotated_fourth_vector[2],
            }
        )
        updated_atoms = [
            updated_fourth_atom if atom.index == command.atom4_index else atom
            for atom in document.atoms
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=document.bonds,
        )

    def _apply_set_frozen_atoms(
        self,
        document: MoleculeDocument,
        command: SetFrozenAtomsCommand,
    ) -> MoleculeDocument:
        self._validate_document_id(document, command)
        if command.action != "replace" and not command.atom_indices:
            raise ValueError(
                "Frozen atom edit requires at least one atom index."
            )
        if command.atom_indices:
            self._validate_atom_indices(document, command.atom_indices)

        frozen_atom_indices = set(document.frozen_atom_indices)
        target_atom_indices = set(command.atom_indices)
        if command.action == "freeze":
            updated_atom_indices = frozen_atom_indices | target_atom_indices
        elif command.action == "unfreeze":
            updated_atom_indices = frozen_atom_indices - target_atom_indices
        else:
            updated_atom_indices = target_atom_indices

        return document.model_copy(
            update={
                "calculation": None,
                "frozen_atom_indices": sorted(updated_atom_indices),
            },
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

        next_index = (
            max((atom.index for atom in document.atoms), default=0) + 1
        )
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
            raise ValueError(
                "Cannot delete every atom from a molecule document."
            )

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
        updated_frozen_atom_indices = [
            old_to_new_index[atom_index]
            for atom_index in document.frozen_atom_indices
            if atom_index in old_to_new_index
        ]
        return self._refresh_structure_document(
            document,
            atoms=updated_atoms,
            bonds=updated_bonds,
            frozen_atom_indices=updated_frozen_atom_indices,
        )
