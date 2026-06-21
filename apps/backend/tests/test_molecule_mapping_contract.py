import json
from pathlib import Path

from chemsmart.io.molecules.structure import Molecule

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter


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


def test_shared_schema_expresses_mapping_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    properties = schema["properties"]

    assert schema["required"] == [
        "id",
        "name",
        "document_kind",
        "coordinate_unit",
        "charge",
        "multiplicity",
        "atoms",
        "bonds",
    ]
    assert properties["document_kind"]["const"] == "structure"
    assert properties["coordinate_unit"]["const"] == "angstrom"
    assert properties["charge"]["type"] == ["integer", "null"]
    assert properties["multiplicity"]["type"] == ["integer", "null"]
    assert properties["atoms"]["items"]["properties"]["index"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom1"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom2"]["minimum"] == 1
