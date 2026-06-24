from pathlib import Path

import pytest

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
WATER_COM_PATH = REPOSITORY_ROOT / "sample-data" / "water.com"
WATER_GJF_PATH = REPOSITORY_ROOT / "sample-data" / "water.gjf"
WATER_INP_PATH = REPOSITORY_ROOT / "sample-data" / "water.inp"
WATER_LOG_PATH = REPOSITORY_ROOT / "sample-data" / "water.log"
WATER_OUT_PATH = REPOSITORY_ROOT / "sample-data" / "water.out"


def test_open_molecule_from_path_returns_normalized_document() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    assert document.id == (
        "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
    )
    assert document.name == "str-H2O-102b86d02472"
    assert document.document_kind == "structure"
    assert document.source is not None
    assert document.source.path == str(WATER_PATH)
    assert document.source.filename == "water.xyz"
    assert document.source.filetype == "xyz"
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(bond.atom1, bond.atom2) for bond in document.bonds] == [
        (1, 2),
        (1, 3),
    ]


@pytest.mark.parametrize(
    ("path", "filename", "filetype"),
    [
        (WATER_COM_PATH, "water.com", "com"),
        (WATER_GJF_PATH, "water.gjf", "gjf"),
    ],
)
def test_open_gaussian_input_from_path_returns_normalized_document(
    path: Path,
    filename: str,
    filetype: str,
) -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(path))

    assert document.name.startswith("str-H2O-")
    assert document.document_kind == "structure"
    assert document.source is not None
    assert document.source.path == str(path)
    assert document.source.filename == filename
    assert document.source.filetype == filetype
    assert document.charge == 0
    assert document.multiplicity == 1
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(atom.x, atom.y, atom.z) for atom in document.atoms] == [
        (0.0, 0.0, 0.0),
        (0.76, 0.58, 0.0),
        (-0.76, 0.58, 0.0),
    ]


def test_open_orca_input_from_path_returns_normalized_document() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_INP_PATH))

    assert document.name.startswith("str-H2O-")
    assert document.document_kind == "structure"
    assert document.source is not None
    assert document.source.path == str(WATER_INP_PATH)
    assert document.source.filename == "water.inp"
    assert document.source.filetype == "inp"
    assert document.charge == 0
    assert document.multiplicity == 1
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(atom.x, atom.y, atom.z) for atom in document.atoms] == [
        (0.0, 0.0, 0.0626),
        (-0.792, 0.0, -0.4973),
        (0.792, 0.0, -0.4973),
    ]


def test_open_gaussian_output_from_path_returns_final_structure() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_LOG_PATH))

    assert document.name.startswith("str-H2O-")
    assert document.document_kind == "structure"
    assert document.source is not None
    assert document.source.path == str(WATER_LOG_PATH)
    assert document.source.filename == "water.log"
    assert document.source.filetype == "log"
    assert document.charge == 0
    assert document.multiplicity == 1
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(atom.x, atom.y, atom.z) for atom in document.atoms] == [
        (0.0, 0.0, 0.118224),
        (-0.0, 0.758169, -0.472896),
        (-0.0, -0.758169, -0.472896),
    ]


def test_open_orca_output_from_path_returns_final_structure() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_OUT_PATH))

    assert document.name.startswith("str-H2O-")
    assert document.document_kind == "structure"
    assert document.source is not None
    assert document.source.path == str(WATER_OUT_PATH)
    assert document.source.filename == "water.out"
    assert document.source.filetype == "out"
    assert document.charge == 0
    assert document.multiplicity == 1
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(atom.x, atom.y, atom.z) for atom in document.atoms] == [
        (-0.0, 0.0, 0.087348),
        (-0.75518, 0.0, -0.509674),
        (0.75518, 0.0, -0.509674),
    ]
