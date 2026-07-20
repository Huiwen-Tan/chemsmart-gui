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
    assert document.calculation is None
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
    assert document.calculation is None
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
    assert document.calculation is None
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
    assert document.calculation is not None
    assert document.calculation.program == "gaussian"
    assert document.calculation.normal_termination is True
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
    assert document.calculation is not None
    assert document.calculation.program == "orca"
    assert document.calculation.normal_termination is True
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


def test_preview_molecule_export_returns_xyz_text() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    filename, content = ChemsmartAdapter().preview_molecule_export(
        document,
        "xyz",
    )

    lines = content.splitlines()
    assert filename == "water.xyz"
    assert lines[0] == "3"
    assert lines[1] == "water.xyz    Empirical formula: H2O"
    assert lines[2].split() == [
        "O",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert lines[3].split() == [
        "H",
        "0.7600000000",
        "0.5800000000",
        "0.0000000000",
    ]
    assert lines[4].split() == [
        "H",
        "-0.7600000000",
        "0.5800000000",
        "0.0000000000",
    ]


def test_preview_molecule_export_does_not_overwrite_source_file(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "helium.xyz"
    original_content = "1\nHelium\nHe 1.5 0.0 0.0\n"
    source_path.write_text(original_content, encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    edited_document = document.model_copy(
        update={
            "atoms": [
                document.atoms[0].model_copy(update={"x": 2.0}),
            ],
        },
    )

    filename, content = ChemsmartAdapter().preview_molecule_export(
        edited_document,
        "xyz",
    )

    assert filename == "helium.xyz"
    assert source_path.read_text(encoding="utf-8") == original_content
    assert content.splitlines()[2].split() == [
        "He",
        "2.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]


def test_preview_molecule_export_rejects_unsupported_filetype() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    with pytest.raises(ValueError, match="not supported"):
        ChemsmartAdapter().preview_molecule_export(document, "pdb")


def test_preview_molecule_export_returns_gjf_from_gaussian_input() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_GJF_PATH))
    edited_document = document.model_copy(
        update={
            "atoms": [
                document.atoms[0],
                document.atoms[1].model_copy(
                    update={
                        "x": 1.0,
                        "y": 1.1,
                        "z": 1.2,
                    },
                ),
                document.atoms[2],
            ],
        },
    )

    filename, content = ChemsmartAdapter().preview_molecule_export(
        edited_document,
        "gjf",
    )

    lines = content.splitlines()
    assert filename == "water.gjf"
    assert lines[0] == "%chk=water.chk"
    assert lines[1] == "%nprocshared=1"
    assert lines[2] == "%mem=1GB"
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[5] == "water"
    assert lines[7] == "0 1"
    assert lines[9].split() == [
        "H",
        "1.0000000000",
        "1.1000000000",
        "1.2000000000",
    ]


def test_preview_molecule_export_returns_inp_from_orca_input() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_INP_PATH))
    edited_document = document.model_copy(
        update={
            "atoms": [
                document.atoms[0].model_copy(
                    update={
                        "x": 2.0,
                        "y": 2.1,
                        "z": 2.2,
                    },
                ),
                document.atoms[1],
                document.atoms[2],
            ],
        },
    )

    filename, content = ChemsmartAdapter().preview_molecule_export(
        edited_document,
        "inp",
    )

    lines = content.splitlines()
    assert filename == "water.inp"
    assert lines[0].split() == ["!", "hf", "def2-svp"]
    assert "%pal nprocs 1 end" in lines
    assert "%maxcore 750" in lines
    assert "* xyz 0 1" in lines
    assert [
        line.split()
        for line in lines
        if line.strip().startswith("O")
    ] == [
        [
            "O",
            "2.0000000000",
            "2.1000000000",
            "2.2000000000",
        ],
    ]


def test_preview_input_export_rejects_xyz_source() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    with pytest.raises(ValueError, match="requires a Gaussian"):
        ChemsmartAdapter().preview_molecule_export(document, "gjf")

    with pytest.raises(ValueError, match="requires an ORCA"):
        ChemsmartAdapter().preview_molecule_export(document, "inp")


def test_preview_input_export_rejects_mismatched_input_source() -> None:
    gaussian_document = ChemsmartAdapter().open_molecule_from_path(
        str(WATER_GJF_PATH),
    )
    orca_document = ChemsmartAdapter().open_molecule_from_path(
        str(WATER_INP_PATH),
    )

    with pytest.raises(ValueError, match="requires an ORCA"):
        ChemsmartAdapter().preview_molecule_export(gaussian_document, "inp")

    with pytest.raises(ValueError, match="requires a Gaussian"):
        ChemsmartAdapter().preview_molecule_export(orca_document, "gjf")
