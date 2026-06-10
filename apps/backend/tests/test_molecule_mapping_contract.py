import json
from pathlib import Path

from chemsmart.io.molecules.structure import Molecule

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.molecule import Atom, Bond


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
    graph = molecule.to_graph()

    document = MoleculeDocument(
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
            for atom1, atom2 in sorted(graph.edges())
        ],
    )

    assert document.model_dump() == {
        "id": "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082",
        "name": "str-H2O-102b86d02472",
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


def test_shared_schema_expresses_mapping_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    properties = schema["properties"]

    assert schema["required"] == [
        "id",
        "name",
        "coordinate_unit",
        "charge",
        "multiplicity",
        "atoms",
        "bonds",
    ]
    assert properties["coordinate_unit"]["const"] == "angstrom"
    assert properties["charge"]["type"] == ["integer", "null"]
    assert properties["multiplicity"]["type"] == ["integer", "null"]
    assert properties["atoms"]["items"]["properties"]["index"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom1"]["minimum"] == 1
    assert properties["bonds"]["items"]["properties"]["atom2"]["minimum"] == 1
