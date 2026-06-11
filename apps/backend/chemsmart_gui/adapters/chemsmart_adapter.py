from chemsmart.io.molecules.structure import Molecule

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.molecule import Atom, Bond


class ChemsmartAdapter:
    """
    Adapter layer for future integration with the CHEMSMART Python package.

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

    def open_molecule_from_path(self, path: str) -> None:
        """Placeholder for future CHEMSMART-backed molecule loading."""
        # TODO: Integrate CHEMSMART structure loading here, e.g.:
        # from chemsmart import Molecule
        # return Molecule.from_filepath(path)
        raise NotImplementedError("CHEMSMART integration is not implemented yet.")
