import json
from pathlib import Path

import pytest
from chemsmart.io.molecules.structure import Molecule
from pydantic import ValidationError

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import MoleculeDocument


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
SCHEMA_PATH = (
    REPOSITORY_ROOT
    / "packages"
    / "shared-schema"
    / "molecule-document.schema.json"
)


def test_water_mapping_contract() -> None:
    molecule = Molecule.from_filepath(WATER_PATH)
    document = ChemsmartAdapter().to_document(molecule)

    assert document.model_dump() == {
        "id": "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082",
        "name": "str-H2O-102b86d02472",
        "document_kind": "structure",
        "source": None,
        "calculation": None,
        "coordinate_unit": "angstrom",
        "charge": None,
        "multiplicity": None,
        "atoms": [
            {"index": 1, "element": "O", "x": 0.0, "y": 0.0, "z": 0.0},
            {"index": 2, "element": "H", "x": 0.76, "y": 0.58, "z": 0.0},
            {"index": 3, "element": "H", "x": -0.76, "y": 0.58, "z": 0.0},
        ],
        "bonds": [
            {"atom1": 1, "atom2": 2},
            {"atom1": 1, "atom2": 3},
        ],
        "frozen_atom_indices": [],
        "vibrational_modes": [],
    }


def test_mapping_preserves_explicit_electronic_state() -> None:
    molecule = Molecule(
        symbols=["He"],
        positions=[[0.0, 0.0, 0.0]],
        charge=1,
        multiplicity=2,
    )

    document = ChemsmartAdapter().to_document(molecule)

    assert document.charge == 1
    assert document.multiplicity == 2
    assert document.source is None
    assert document.calculation is None


def test_mapping_preserves_frozen_atoms() -> None:
    molecule = Molecule(
        symbols=["O", "H", "H"],
        positions=[
            [0.0, 0.0, 0.0],
            [0.76, 0.58, 0.0],
            [-0.76, 0.58, 0.0],
        ],
        frozen_atoms=[-1, 0, -1],
    )

    document = ChemsmartAdapter().to_document(molecule)
    mapped_molecule = ChemsmartAdapter().to_molecule(document)

    assert document.frozen_atom_indices == [1, 3]
    assert mapped_molecule.frozen_atoms == [-1, 0, -1]


def test_mapping_preserves_vibrational_modes() -> None:
    molecule = Molecule(
        symbols=["O", "H", "H"],
        positions=[
            [0.0, 0.0, 0.0],
            [0.76, 0.58, 0.0],
            [-0.76, 0.58, 0.0],
        ],
        vibrational_frequencies=[-500.0, 1628.3334],
        vibrational_reduced_masses=[1.2, 1.0828],
        vibrational_force_constants=[0.4, 1.6916],
        vibrational_ir_intensities=[12.5, 71.6875],
        vibrational_mode_symmetries=["A1", "B2"],
        vibrational_modes=[
            [
                [0.0, 0.0, -0.1],
                [0.0, 0.4, 0.5],
                [0.0, -0.4, 0.5],
            ],
            [
                [0.0, 0.0, -0.07],
                [0.0, 0.43, 0.56],
                [0.0, -0.43, 0.56],
            ],
        ],
    )

    document = ChemsmartAdapter().to_document(molecule)

    assert len(document.vibrational_modes) == 2
    first_mode = document.vibrational_modes[0]
    assert first_mode.index == 1
    assert first_mode.frequency_cm_minus_1 == -500.0
    assert first_mode.is_imaginary is True
    assert first_mode.reduced_mass_amu == 1.2
    assert first_mode.force_constant_mdyne_per_angstrom == 0.4
    assert first_mode.ir_intensity_km_per_mol == 12.5
    assert first_mode.symmetry == "A1"
    assert [vector.atom_index for vector in first_mode.displacements] == [
        1,
        2,
        3,
    ]
    assert first_mode.displacements[1].y == 0.4


def test_vibrational_mode_displacements_must_match_atoms() -> None:
    document = ChemsmartAdapter().to_document(
        Molecule(
            symbols=["O", "H", "H"],
            positions=[
                [0.0, 0.0, 0.0],
                [0.76, 0.58, 0.0],
                [-0.76, 0.58, 0.0],
            ],
            vibrational_frequencies=[1628.3334],
            vibrational_modes=[
                [
                    [0.0, 0.0, -0.07],
                    [0.0, 0.43, 0.56],
                    [0.0, -0.43, 0.56],
                ],
            ],
        )
    )
    data = document.model_dump()
    data["vibrational_modes"][0]["displacements"] = data[
        "vibrational_modes"
    ][0]["displacements"][:2]

    with pytest.raises(ValidationError, match="omit atom indices"):
        MoleculeDocument.model_validate(data)


def test_shared_schema_expresses_mapping_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    properties = schema["properties"]

    assert schema["required"] == [
        "id",
        "name",
        "document_kind",
        "source",
        "calculation",
        "coordinate_unit",
        "charge",
        "multiplicity",
        "atoms",
        "bonds",
        "frozen_atom_indices",
        "vibrational_modes",
    ]
    assert properties["document_kind"]["const"] == "structure"
    source_schema = properties["source"]["anyOf"][0]
    assert source_schema["required"] == ["path", "filename", "filetype"]
    assert source_schema["properties"]["path"]["minLength"] == 1
    assert source_schema["properties"]["filename"]["minLength"] == 1
    assert source_schema["properties"]["filetype"]["minLength"] == 1
    calculation_schema = properties["calculation"]["anyOf"][0]
    assert calculation_schema["required"] == [
        "program",
        "normal_termination",
    ]
    assert calculation_schema["properties"]["program"]["enum"] == [
        "gaussian",
        "orca",
    ]
    assert (
        calculation_schema["properties"]["normal_termination"]["type"]
        == "boolean"
    )
    assert properties["coordinate_unit"]["const"] == "angstrom"
    assert properties["charge"]["type"] == ["integer", "null"]
    assert properties["multiplicity"]["type"] == ["integer", "null"]
    assert properties["atoms"]["items"]["properties"]["index"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom1"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom2"]["minimum"] == 1
    assert properties["frozen_atom_indices"]["uniqueItems"] is True
    assert properties["frozen_atom_indices"]["items"]["minimum"] == 1
    mode_schema = properties["vibrational_modes"]["items"]
    assert mode_schema["required"] == [
        "index",
        "frequency_cm_minus_1",
        "is_imaginary",
        "reduced_mass_amu",
        "force_constant_mdyne_per_angstrom",
        "ir_intensity_km_per_mol",
        "symmetry",
        "displacements",
    ]
    assert mode_schema["properties"]["index"]["minimum"] == 1
    assert "cm^-1" in mode_schema["properties"][
        "frequency_cm_minus_1"
    ]["description"]
    displacement_schema = mode_schema["properties"]["displacements"]["items"]
    assert displacement_schema["required"] == ["atom_index", "x", "y", "z"]
    assert displacement_schema["properties"]["atom_index"]["minimum"] == 1
