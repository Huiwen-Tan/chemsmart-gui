from ase.io.formats import UnknownFileTypeError
from chemsmart.io.molecules.structure import Molecule

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.molecule import Atom, Bond


class ChemsmartAdapter:
    """
    Adapter layer for integration with the CHEMSMART Python package.

    This class must be the only place where the GUI backend directly imports
    or calls CHEMSMART internals.
    """

    def to_document(self, molecule: Molecule) -> MoleculeDocument:
        """Normalize a CHEMSMART molecule for GUI transport."""
        graph = molecule.to_graph()
        edges = sorted(tuple(sorted(edge)) for edge in graph.edges())

        return MoleculeDocument(
            id=molecule.structure_id,
            name=molecule.structure_label,
            coordinate_unit="angstrom",
            charge=molecule.charge,
            multiplicity=molecule.multiplicity,
            atoms=[
                Atom(index=index, element=element, x=x, y=y, z=z)
                for index, (element, (x, y, z)) in enumerate(
                    zip(molecule.chemical_symbols, molecule.positions),
                    start=1,
                )
            ],
            bonds=[
                Bond(atom1=atom1 + 1, atom2=atom2 + 1)
                for atom1, atom2 in edges
            ],
        )

    def open_molecule_from_path(self, path: str) -> MoleculeDocument:
        """Open one structure through CHEMSMART and normalize it."""
        try:
            molecule = Molecule.from_filepath(path)
        except UnknownFileTypeError as exc:
            raise ValueError(
                f"Unsupported molecular file format: {exc}."
            ) from exc
        except ValueError as exc:
            raise ValueError(
                f"Could not open molecular file '{path}': {exc}"
            ) from exc

        if molecule is None:
            raise ValueError(f"No molecular structure found in '{path}'.")

        return self.to_document(molecule)
