import shutil
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
XTB_CO2_OUTPUT_PATH = (
    REPOSITORY_ROOT
    / "sample-data"
    / "xtb"
    / "co2_ohess"
    / "co2_ohess.out"
)


def assert_source_matches_file(path: Path, source) -> None:
    source_stat = path.stat()
    assert source.path == str(path)
    assert source.filename == path.name
    assert source.filetype == path.suffix.lower().removeprefix(".")
    assert source.size_bytes == source_stat.st_size
    assert source.modified_time_ns == source_stat.st_mtime_ns


def test_open_molecule_from_path_returns_normalized_document() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    assert document.id == (
        "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
    )
    assert document.name == "str-H2O-102b86d02472"
    assert document.document_kind == "structure"
    assert document.source is not None
    assert_source_matches_file(WATER_PATH, document.source)
    assert document.calculation is None
    assert document.coordinate_unit == "angstrom"
    assert [atom.index for atom in document.atoms] == [1, 2, 3]
    assert [atom.element for atom in document.atoms] == ["O", "H", "H"]
    assert [(bond.atom1, bond.atom2) for bond in document.bonds] == [
        (1, 2),
        (1, 3),
    ]
    assert document.frozen_atom_indices == []


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
    assert document.frozen_atom_indices == []


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
    assert document.frozen_atom_indices == []


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
    assert len(document.vibrational_modes) == 3
    first_mode = document.vibrational_modes[0]
    assert first_mode.index == 1
    assert first_mode.frequency_cm_minus_1 == pytest.approx(1628.3334)
    assert first_mode.is_imaginary is False
    assert first_mode.reduced_mass_amu == pytest.approx(1.0828)
    assert first_mode.force_constant_mdyne_per_angstrom == pytest.approx(
        1.6916,
    )
    assert first_mode.ir_intensity_km_per_mol == pytest.approx(71.6875)
    assert first_mode.symmetry == "A1"
    assert [vector.atom_index for vector in first_mode.displacements] == [
        1,
        2,
        3,
    ]
    assert first_mode.displacements[0].z == pytest.approx(-0.07)


def test_open_gaussian_output_document_returns_trajectory() -> None:
    document = ChemsmartAdapter().open_document_from_path(str(WATER_LOG_PATH))

    assert document.document_kind == "trajectory"
    assert document.name.startswith("traj-water-")
    assert document.source is not None
    assert document.source.path == str(WATER_LOG_PATH)
    assert document.calculation is not None
    assert document.calculation.program == "gaussian"
    assert document.calculation.normal_termination is True
    assert len(document.frames) == 4
    assert len(document.frame_properties) == len(document.frames)
    assert document.id
    assert all(
        frame_property["structure_id"] == frame.id
        for frame_property, frame in zip(
            document.frame_properties,
            document.frames,
        )
    )
    assert all(
        isinstance(frame_property["energy_hartree"], float)
        for frame_property in document.frame_properties
    )
    assert document.frame_properties[-1]["is_optimized_structure"] is True
    assert len(document.frames[-1].vibrational_modes) == 3


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
    assert len(document.vibrational_modes) == 3
    first_mode = document.vibrational_modes[0]
    assert first_mode.frequency_cm_minus_1 == pytest.approx(1625.35)
    assert first_mode.is_imaginary is False
    assert first_mode.reduced_mass_amu is None
    assert first_mode.force_constant_mdyne_per_angstrom is None
    assert first_mode.ir_intensity_km_per_mol == pytest.approx(64.27)
    assert first_mode.symmetry is None
    assert [vector.atom_index for vector in first_mode.displacements] == [
        1,
        2,
        3,
    ]
    assert first_mode.displacements[0].z == pytest.approx(-0.069893)


def test_open_orca_output_document_returns_trajectory() -> None:
    document = ChemsmartAdapter().open_document_from_path(str(WATER_OUT_PATH))

    assert document.document_kind == "trajectory"
    assert document.name.startswith("traj-water-")
    assert document.source is not None
    assert document.source.path == str(WATER_OUT_PATH)
    assert document.calculation is not None
    assert document.calculation.program == "orca"
    assert document.calculation.normal_termination is True
    assert len(document.frames) == 5
    assert len(document.frame_properties) == len(document.frames)
    assert document.id
    assert all(
        frame_property["structure_id"] == frame.id
        for frame_property, frame in zip(
            document.frame_properties,
            document.frames,
        )
    )
    assert all(
        isinstance(frame_property["energy_hartree"], float)
        for frame_property in document.frame_properties
    )
    assert document.frame_properties[-1]["is_optimized_structure"] is True
    assert len(document.frames[-1].vibrational_modes) == 3


def test_open_xtb_output_document_returns_result_trajectory() -> None:
    document = ChemsmartAdapter().open_document_from_path(
        str(XTB_CO2_OUTPUT_PATH)
    )

    assert document.document_kind == "trajectory"
    assert document.name.startswith("traj-co2_ohess-")
    assert document.source is not None
    assert document.source.path == str(XTB_CO2_OUTPUT_PATH)
    assert document.source.filename == "co2_ohess.out"
    assert document.source.filetype == "out"
    assert document.calculation is not None
    assert document.calculation.program == "xtb"
    assert document.calculation.normal_termination is True
    assert len(document.frames) == 5
    assert len(document.frame_properties) == 5
    assert [frame.charge for frame in document.frames] == [0] * 5
    assert [frame.multiplicity for frame in document.frames] == [1] * 5
    assert [
        frame_property["energy_hartree"]
        for frame_property in document.frame_properties
    ] == pytest.approx(
        [
            -10.297398913536,
            -10.308447045699,
            -10.30845207658,
            -10.308452237199,
            -10.308452289174,
        ]
    )
    assert document.frame_properties[-1]["is_optimized_structure"] is True

    final_frame = document.frames[-1]
    assert [atom.element for atom in final_frame.atoms] == ["O", "O", "C"]
    assert len(final_frame.vibrational_modes) == 4
    first_mode = final_frame.vibrational_modes[0]
    assert first_mode.frequency_cm_minus_1 == pytest.approx(600.3117)
    assert first_mode.reduced_mass_amu == pytest.approx(13.0986)
    assert first_mode.force_constant_mdyne_per_angstrom == pytest.approx(0.0)
    assert first_mode.ir_intensity_km_per_mol == pytest.approx(68.6947)
    assert first_mode.symmetry == "a"
    assert len(first_mode.displacements) == 3


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


def test_preview_xyz_export_allows_changed_source_revision(
    tmp_path: Path,
) -> None:
    source_path = tmp_path / "helium.xyz"
    source_path.write_text("1\nHelium\nHe 1.5 0.0 0.0\n", encoding="utf-8")
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(
        "1\nHelium changed\nHe 9.0 9.0 9.0\n",
        encoding="utf-8",
    )

    filename, content = ChemsmartAdapter().preview_molecule_export(
        document,
        "xyz",
    )

    assert filename == "helium.xyz"
    assert content.splitlines()[2].split() == [
        "He",
        "1.5000000000",
        "0.0000000000",
        "0.0000000000",
    ]


def test_preview_xyz_export_omits_frozen_atoms() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    _, content = ChemsmartAdapter().preview_molecule_export(
        document.model_copy(update={"frozen_atom_indices": [1]}),
        "xyz",
    )

    assert content.splitlines()[2].split() == [
        "O",
        "0.0000000000",
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


@pytest.mark.parametrize(
    "source_path",
    [
        WATER_COM_PATH,
        WATER_GJF_PATH,
    ],
)
def test_preview_molecule_export_returns_com_from_gaussian_input(
    source_path: Path,
) -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))

    filename, content = ChemsmartAdapter().preview_molecule_export(
        document,
        "com",
    )

    lines = content.splitlines()
    assert filename == "water.com"
    assert lines[0] == "%chk=water.chk"
    assert lines[1] == "%nprocshared=1"
    assert lines[2] == "%mem=1GB"
    assert lines[3] == "# hf/sto-3g opt"
    assert lines[5] == "water"
    assert lines[7] == "0 1"


def test_preview_input_export_writes_frozen_atoms() -> None:
    gaussian_document = ChemsmartAdapter().open_molecule_from_path(
        str(WATER_GJF_PATH),
    )
    orca_document = ChemsmartAdapter().open_molecule_from_path(
        str(WATER_INP_PATH),
    )

    _, gaussian_content = ChemsmartAdapter().preview_molecule_export(
        gaussian_document.model_copy(update={"frozen_atom_indices": [1, 3]}),
        "gjf",
    )
    _, orca_content = ChemsmartAdapter().preview_molecule_export(
        orca_document.model_copy(update={"frozen_atom_indices": [1, 3]}),
        "inp",
    )

    assert gaussian_content.splitlines()[8].split() == [
        "O",
        "-1",
        "0.0000000000",
        "0.0000000000",
        "0.0000000000",
    ]
    assert gaussian_content.splitlines()[9].split()[1] == "0"
    assert gaussian_content.splitlines()[10].split()[1] == "-1"
    assert "%geom" in orca_content
    assert "{ C 0 C }" in orca_content
    assert "{ C 2 C }" in orca_content
    assert "{ C 1 C }" not in orca_content


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
        ChemsmartAdapter().preview_molecule_export(document, "com")

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

    with pytest.raises(ValueError, match="requires a Gaussian"):
        ChemsmartAdapter().preview_molecule_export(orca_document, "com")


@pytest.mark.parametrize(
    ("source_fixture", "filetype"),
    [
        (WATER_GJF_PATH, "com"),
        (WATER_GJF_PATH, "gjf"),
        (WATER_INP_PATH, "inp"),
    ],
)
def test_preview_input_export_rejects_changed_source_revision(
    source_fixture: Path,
    filetype: str,
    tmp_path: Path,
) -> None:
    source_path = tmp_path / source_fixture.name
    shutil.copyfile(source_fixture, source_path)
    document = ChemsmartAdapter().open_molecule_from_path(str(source_path))
    source_path.write_text(
        source_path.read_text(encoding="utf-8") + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="changed since this document"):
        ChemsmartAdapter().preview_molecule_export(document, filetype)


def test_preview_input_export_requires_source_revision_metadata() -> None:
    document = ChemsmartAdapter().open_molecule_from_path(str(WATER_GJF_PATH))
    assert document.source is not None
    document_without_revision = document.model_copy(
        update={
            "source": document.source.model_copy(
                update={
                    "size_bytes": None,
                    "modified_time_ns": None,
                },
            ),
        },
    )

    with pytest.raises(ValueError, match="requires source revision metadata"):
        ChemsmartAdapter().preview_molecule_export(
            document_without_revision,
            "gjf",
        )
