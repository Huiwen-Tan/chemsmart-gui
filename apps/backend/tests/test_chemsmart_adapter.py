from pathlib import Path

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"


def test_open_molecule_from_path_returns_normalized_document() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    assert document.id == (
        "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
    )
    assert document.name == "str-H2O-102b86d02472"
    assert document.document_kind == "structure"
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(bond.atom1, bond.atom2) for bond in document.bonds] == [
        (1, 2),
        (1, 3),
    ]
