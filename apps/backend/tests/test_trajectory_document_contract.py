import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import TrajectoryDocument


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
SCHEMA_PATH = (
    REPOSITORY_ROOT
    / "packages"
    / "shared-schema"
    / "trajectory-document.schema.json"
)


def test_trajectory_document_serializes_molecule_frames() -> None:
    frame = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    document = TrajectoryDocument(
        id="trajectory-water",
        name="Water trajectory",
        document_kind="trajectory",
        source=None,
        calculation=None,
        coordinate_unit="angstrom",
        frames=[frame],
        frame_properties=[{"step": 1}],
    )

    dump = document.model_dump()
    assert dump["id"] == "trajectory-water"
    assert dump["document_kind"] == "trajectory"
    assert dump["coordinate_unit"] == "angstrom"
    assert dump["frames"][0]["document_kind"] == "structure"
    assert dump["frames"][0]["coordinate_unit"] == "angstrom"
    assert dump["frame_properties"] == [{"step": 1}]


def test_trajectory_document_requires_at_least_one_frame() -> None:
    with pytest.raises(ValidationError):
        TrajectoryDocument(
            id="empty-trajectory",
            name="Empty trajectory",
            document_kind="trajectory",
            source=None,
            calculation=None,
            coordinate_unit="angstrom",
            frames=[],
            frame_properties=[],
        )


def test_trajectory_document_requires_frame_properties_per_frame() -> None:
    frame = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    with pytest.raises(ValidationError, match="one entry per trajectory frame"):
        TrajectoryDocument(
            id="mismatched-trajectory",
            name="Mismatched trajectory",
            document_kind="trajectory",
            source=None,
            calculation=None,
            coordinate_unit="angstrom",
            frames=[frame],
            frame_properties=[],
        )


def test_shared_schema_expresses_trajectory_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    properties = schema["properties"]

    assert schema["title"] == "TrajectoryDocument"
    assert schema["required"] == [
        "id",
        "name",
        "document_kind",
        "source",
        "calculation",
        "coordinate_unit",
        "frames",
        "frame_properties",
    ]
    assert properties["id"]["minLength"] == 1
    assert "trajectory_id" in properties["id"]["description"]
    assert properties["document_kind"]["const"] == "trajectory"
    assert properties["coordinate_unit"]["const"] == "angstrom"
    assert properties["frames"]["minItems"] == 1
    assert properties["frames"]["items"]["$ref"] == (
        "molecule-document.schema.json"
    )
    assert properties["frame_properties"]["items"]["type"] == "object"
