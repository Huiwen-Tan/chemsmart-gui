from pathlib import Path

from ase.io.formats import UnknownFileTypeError
from chemsmart.io.gaussian.output import Gaussian16Output
from chemsmart.io.molecules.structure import Molecule
from chemsmart.io.orca.output import ORCAOutput
from chemsmart.utils.io import get_program_type_from_file

from chemsmart_gui.domain.document import (
    CalculationMetadata,
    DocumentSource,
    MoleculeDocument,
)
from chemsmart_gui.domain.molecule import Atom, Bond


def document_source_from_path(path: str) -> DocumentSource:
    source_path = Path(path)
    return DocumentSource(
        path=path,
        filename=source_path.name,
        filetype=source_path.suffix.lower().removeprefix("."),
    )


class ChemsmartAdapter:
    """
    Adapter layer for integration with the CHEMSMART Python package.

    This class must be the only place where the GUI backend directly imports
    or calls CHEMSMART internals.
    """

    def to_document(
        self,
        molecule: Molecule,
        source: DocumentSource | None = None,
        calculation: CalculationMetadata | None = None,
    ) -> MoleculeDocument:
        """Normalize a CHEMSMART molecule for GUI transport."""
        graph = molecule.to_graph()
        edges = sorted(tuple(sorted(edge)) for edge in graph.edges())

        return MoleculeDocument(
            id=molecule.structure_id,
            name=molecule.structure_label,
            document_kind="structure",
            source=source,
            calculation=calculation,
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

    def _open_output_document(
        self,
        path: str,
        source: DocumentSource,
    ) -> MoleculeDocument | None:
        source_path = Path(path)
        suffix = source_path.suffix.lower()

        if suffix == ".log":
            program = "gaussian"
            parser = Gaussian16Output(filename=path)
        elif suffix == ".out":
            program = get_program_type_from_file(path)
            if program == "gaussian":
                parser = Gaussian16Output(filename=path)
            elif program == "orca":
                parser = ORCAOutput(filename=path)
            else:
                return None
        else:
            return None

        molecule = parser.get_molecule(index="-1")
        return self.to_document(
            molecule,
            source=source,
            calculation=CalculationMetadata(
                program=program,
                normal_termination=parser.normal_termination,
            ),
        )

    def open_molecule_from_path(self, path: str) -> MoleculeDocument:
        """Open one structure through CHEMSMART and normalize it."""
        source = document_source_from_path(path)
        try:
            output_document = self._open_output_document(path, source=source)
            if output_document is not None:
                return output_document

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

        return self.to_document(
            molecule,
            source=source,
        )
