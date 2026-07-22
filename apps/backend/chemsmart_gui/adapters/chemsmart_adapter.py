from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

from ase.io.formats import UnknownFileTypeError
from chemsmart.io.gaussian.input import Gaussian16Input
from chemsmart.io.gaussian.output import Gaussian16Output
from chemsmart.io.molecules.structure import Molecule
from chemsmart.io.orca.input import ORCAInput
from chemsmart.io.orca.output import ORCAOutput
from chemsmart.jobs.gaussian.job import GaussianJob
from chemsmart.jobs.gaussian.settings import GaussianJobSettings
from chemsmart.jobs.gaussian.writer import GaussianInputWriter
from chemsmart.jobs.orca.job import ORCAJob
from chemsmart.jobs.orca.settings import ORCAJobSettings
from chemsmart.jobs.orca.writer import ORCAInputWriter
from chemsmart.utils.io import get_program_type_from_file

from chemsmart_gui.domain.document import (
    CalculationMetadata,
    DocumentSource,
    MoleculeDocument,
)
from chemsmart_gui.domain.molecule import (
    Atom,
    Bond,
    VibrationalDisplacement,
    VibrationalMode,
)


def _safe_filename_stem(name: str) -> str:
    safe_stem = "".join(
        character
        if character.isalnum() or character in {".", "-", "_"}
        else "_"
        for character in name
    ).strip("._")
    return safe_stem or "molecule"


def document_source_from_path(path: str) -> DocumentSource:
    source_path = Path(path)
    source_stat = source_path.stat() if source_path.exists() else None
    return DocumentSource(
        path=path,
        filename=source_path.name,
        filetype=source_path.suffix.lower().removeprefix("."),
        size_bytes=source_stat.st_size if source_stat is not None else None,
        modified_time_ns=(
            source_stat.st_mtime_ns if source_stat is not None else None
        ),
    )


def _frozen_atom_indices_from_molecule(molecule: Molecule) -> list[int]:
    frozen_atoms = getattr(molecule, "frozen_atoms", None)
    if not frozen_atoms:
        return []

    return [
        atom_index
        for atom_index, frozen_value in enumerate(frozen_atoms, start=1)
        if frozen_value == -1
    ]


def _frozen_atom_mask_from_document(
    document: MoleculeDocument,
) -> list[int] | None:
    if not document.frozen_atom_indices:
        return None

    frozen_atom_indices = set(document.frozen_atom_indices)
    return [
        -1 if atom.index in frozen_atom_indices else 0
        for atom in document.atoms
    ]


def _optional_float(values: object, index: int) -> float | None:
    if not values:
        return None

    try:
        value = values[index]  # type: ignore[index]
    except (IndexError, TypeError):
        return None

    return None if value is None else float(value)


def _optional_string(values: object, index: int) -> str | None:
    if not values:
        return None

    try:
        value = values[index]  # type: ignore[index]
    except (IndexError, TypeError):
        return None

    return None if value is None else str(value)


def _vibrational_displacements_from_mode(
    mode: object,
) -> list[VibrationalDisplacement]:
    if mode is None:
        return []

    displacements: list[VibrationalDisplacement] = []
    for atom_index, displacement in enumerate(mode, start=1):  # type: ignore[union-attr]
        if len(displacement) != 3:
            raise ValueError(
                "Vibrational mode displacement must contain x, y, and z."
            )
        displacements.append(
            VibrationalDisplacement(
                atom_index=atom_index,
                x=float(displacement[0]),
                y=float(displacement[1]),
                z=float(displacement[2]),
            )
        )
    return displacements


def _vibrational_modes_from_molecule(
    molecule: Molecule,
) -> list[VibrationalMode]:
    frequencies = getattr(molecule, "vibrational_frequencies", None) or []
    normal_modes = getattr(molecule, "vibrational_modes", None) or []
    reduced_masses = (
        getattr(molecule, "vibrational_reduced_masses", None) or []
    )
    force_constants = (
        getattr(molecule, "vibrational_force_constants", None) or []
    )
    ir_intensities = (
        getattr(molecule, "vibrational_ir_intensities", None)
        or getattr(molecule, "integrated_absorption_coefficients", None)
        or []
    )
    mode_symmetries = (
        getattr(molecule, "vibrational_mode_symmetries", None) or []
    )

    vibrational_modes: list[VibrationalMode] = []
    for index, frequency in enumerate(frequencies, start=1):
        normal_mode = (
            normal_modes[index - 1]
            if index - 1 < len(normal_modes)
            else None
        )
        frequency_value = float(frequency)
        vibrational_modes.append(
            VibrationalMode(
                index=index,
                frequency_cm_minus_1=frequency_value,
                is_imaginary=frequency_value < 0.0,
                reduced_mass_amu=_optional_float(reduced_masses, index - 1),
                force_constant_mdyne_per_angstrom=_optional_float(
                    force_constants,
                    index - 1,
                ),
                ir_intensity_km_per_mol=_optional_float(
                    ir_intensities,
                    index - 1,
                ),
                symmetry=_optional_string(mode_symmetries, index - 1),
                displacements=_vibrational_displacements_from_mode(
                    normal_mode,
                ),
            )
        )

    return vibrational_modes


@dataclass(frozen=True)
class _PreviewJobRunner:
    num_cores: int = 1
    mem_gb: int = 1


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
            frozen_atom_indices=_frozen_atom_indices_from_molecule(molecule),
            vibrational_modes=_vibrational_modes_from_molecule(molecule),
        )

    def to_molecule(
        self,
        document: MoleculeDocument,
        *,
        include_frozen_atoms: bool = True,
    ) -> Molecule:
        """Create a CHEMSMART molecule from a normalized GUI document."""
        return Molecule(
            symbols=[atom.element for atom in document.atoms],
            positions=[[atom.x, atom.y, atom.z] for atom in document.atoms],
            charge=document.charge,
            multiplicity=document.multiplicity,
            frozen_atoms=(
                _frozen_atom_mask_from_document(document)
                if include_frozen_atoms
                else None
            ),
        )

    def suggested_export_filename(
        self,
        document: MoleculeDocument,
        filetype: str,
    ) -> str:
        """Return a safe default export filename for a molecule document."""
        source_name = (
            document.source.filename if document.source else document.name
        )
        stem = _safe_filename_stem(Path(source_name).stem)
        return f"{stem}.{filetype}"

    def preview_molecule_export(
        self,
        document: MoleculeDocument,
        filetype: str,
    ) -> tuple[str, str]:
        """Generate molecule export text using CHEMSMART writer behavior."""
        if filetype == "xyz":
            return self._preview_xyz_export(document, filetype)
        if filetype in {"com", "gjf"}:
            return self._preview_gaussian_input_export(document, filetype)
        if filetype == "inp":
            return self._preview_orca_input_export(document)

        raise ValueError(
            f"Export preview filetype '{filetype}' is not supported."
        )

    def _preview_xyz_export(
        self,
        document: MoleculeDocument,
        filetype: str,
    ) -> tuple[str, str]:
        filename = self.suggested_export_filename(document, filetype)
        molecule = self.to_molecule(document, include_frozen_atoms=False)
        with TemporaryDirectory() as temporary_directory:
            preview_path = Path(temporary_directory) / filename
            molecule.write(str(preview_path), format=filetype, mode="w")
            content = preview_path.read_text(encoding="utf-8")

        return filename, content

    def _source_path_for_input_preview(
        self,
        document: MoleculeDocument,
        filetype: str,
    ) -> Path:
        if document.source is None:
            raise ValueError(
                f"Input export preview for '{filetype}' requires an existing "
                "source input file."
            )

        source_path = Path(document.source.path)
        if not source_path.exists():
            raise ValueError(
                f"Source file for input export preview does not exist: "
                f"{document.source.path}"
            )

        source_filetype = source_path.suffix.lower().removeprefix(".")
        if (
            filetype in {"com", "gjf"}
            and source_filetype not in {"com", "gjf"}
        ):
            raise ValueError(
                f"Input export preview for '{filetype}' requires a "
                "Gaussian .com or .gjf source document."
            )
        if filetype == "inp" and source_filetype != "inp":
            raise ValueError(
                "Input export preview for 'inp' requires an ORCA "
                ".inp source document."
            )

        self._validate_source_revision(document, source_path)

        return source_path

    @staticmethod
    def _validate_source_revision(
        document: MoleculeDocument,
        source_path: Path,
    ) -> None:
        if document.source is None:
            return

        if (
            document.source.size_bytes is None
            or document.source.modified_time_ns is None
        ):
            raise ValueError(
                "Input export preview requires source revision metadata. "
                "Reopen the source file and try again."
            )

        source_stat = source_path.stat()
        if (
            source_stat.st_size != document.source.size_bytes
            or source_stat.st_mtime_ns != document.source.modified_time_ns
        ):
            raise ValueError(
                "Source file changed since this document was opened. "
                "Reopen the source file before previewing input export."
            )

    @staticmethod
    def _apply_document_electronic_state(
        settings: GaussianJobSettings | ORCAJobSettings,
        document: MoleculeDocument,
    ) -> None:
        if document.charge is not None:
            settings.charge = document.charge
        if document.multiplicity is not None:
            settings.multiplicity = document.multiplicity

        if settings.charge is None or settings.multiplicity is None:
            raise ValueError(
                "Input export preview requires charge and multiplicity."
            )

    @staticmethod
    def _gaussian_title_from_input(parser: Gaussian16Input) -> str | None:
        if parser.num_content_groups <= 1:
            return None
        title_group = parser.content_groups[1]
        if not title_group:
            return None
        return "\n".join(title_group)

    def _preview_gaussian_input_export(
        self,
        document: MoleculeDocument,
        filetype: str,
    ) -> tuple[str, str]:
        source_path = self._source_path_for_input_preview(document, filetype)
        parser = Gaussian16Input(filename=str(source_path))
        settings = GaussianJobSettings.from_filepath(str(source_path))
        settings.route_to_be_written = parser.route_string
        title = self._gaussian_title_from_input(parser)
        if title is not None:
            settings.title = title
        self._apply_document_electronic_state(settings, document)

        filename = self.suggested_export_filename(document, filetype)
        label = Path(filename).stem
        molecule = self.to_molecule(document)
        molecule.charge = settings.charge
        molecule.multiplicity = settings.multiplicity
        job = GaussianJob(
            molecule=molecule,
            settings=settings,
            label=label,
            jobrunner=_PreviewJobRunner(
                num_cores=parser.nproc,
                mem_gb=parser.mem,
            ),
        )
        with TemporaryDirectory() as temporary_directory:
            GaussianInputWriter(job=job).write(
                target_directory=temporary_directory,
            )
            preview_path = Path(temporary_directory) / f"{label}.com"
            content = preview_path.read_text(encoding="utf-8")

        return filename, content

    def _preview_orca_input_export(
        self,
        document: MoleculeDocument,
    ) -> tuple[str, str]:
        source_path = self._source_path_for_input_preview(document, "inp")
        parser = ORCAInput(filename=str(source_path))
        settings = ORCAJobSettings.from_filepath(str(source_path))
        settings.route_to_be_written = parser.route_string
        self._apply_document_electronic_state(settings, document)

        filename = self.suggested_export_filename(document, "inp")
        label = Path(filename).stem
        molecule = self.to_molecule(document)
        molecule.charge = settings.charge
        molecule.multiplicity = settings.multiplicity
        job = ORCAJob(
            molecule=molecule,
            settings=settings,
            label=label,
            jobrunner=_PreviewJobRunner(),
        )
        with TemporaryDirectory() as temporary_directory:
            ORCAInputWriter(job=job).write(
                target_directory=temporary_directory,
            )
            preview_path = Path(temporary_directory) / f"{label}.inp"
            content = preview_path.read_text(encoding="utf-8")

        return filename, content

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
