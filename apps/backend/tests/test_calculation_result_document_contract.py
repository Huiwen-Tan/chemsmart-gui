import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from chemsmart_gui.adapters.chemsmart_adapter import ChemsmartAdapter
from chemsmart_gui.domain.document import (
    CalculationMetadata,
    CalculationResultDocument,
)


REPOSITORY_ROOT = Path(__file__).parents[3]
WATER_PATH = REPOSITORY_ROOT / "sample-data" / "water.xyz"
SCHEMA_PATH = (
    REPOSITORY_ROOT
    / "packages"
    / "shared-schema"
    / "calculation-result-document.schema.json"
)


def create_result_document() -> CalculationResultDocument:
    molecule = ChemsmartAdapter().open_molecule_from_path(str(WATER_PATH))

    return CalculationResultDocument(
        id="record-water",
        name="Water calculation",
        document_kind="calculation_result",
        source=None,
        calculation=CalculationMetadata(
            program="gaussian",
            normal_termination=True,
        ),
        record_id="record-water",
        meta={"program": "gaussian", "jobtype": "opt"},
        results={"electronic_energy": -76.0},
        molecules=[molecule],
        provenance={"source_file": "water.log"},
    )


def test_calculation_result_document_serializes_record_shape() -> None:
    document = create_result_document()

    dump = document.model_dump()
    assert dump["id"] == "record-water"
    assert dump["record_id"] == "record-water"
    assert dump["document_kind"] == "calculation_result"
    assert dump["calculation"] == {
        "program": "gaussian",
        "normal_termination": True,
    }
    assert dump["meta"] == {"program": "gaussian", "jobtype": "opt"}
    assert dump["results"] == {"electronic_energy": -76.0}
    assert dump["molecules"][0]["document_kind"] == "structure"
    assert dump["provenance"] == {"source_file": "water.log"}


def test_calculation_result_document_requires_matching_record_id() -> None:
    document = create_result_document()
    data = document.model_dump()
    data["id"] = "different-id"

    with pytest.raises(ValidationError, match="id must match record_id"):
        CalculationResultDocument.model_validate(data)


def test_calculation_result_document_requires_at_least_one_molecule() -> None:
    document = create_result_document()
    data = document.model_dump()
    data["molecules"] = []

    with pytest.raises(ValidationError):
        CalculationResultDocument.model_validate(data)


def test_shared_schema_expresses_calculation_result_contract() -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    properties = schema["properties"]

    assert schema["title"] == "CalculationResultDocument"
    assert schema["required"] == [
        "id",
        "name",
        "document_kind",
        "source",
        "calculation",
        "record_id",
        "meta",
        "results",
        "molecules",
        "provenance",
    ]
    assert properties["id"]["minLength"] == 1
    assert "record_id" in properties["id"]["description"]
    assert properties["document_kind"]["const"] == "calculation_result"
    assert properties["record_id"]["minLength"] == 1
    assert properties["molecules"]["minItems"] == 1
    assert properties["molecules"]["items"]["$ref"] == (
        "molecule-document.schema.json"
    )
    assert properties["meta"]["additionalProperties"]["$ref"] == (
        "#/$defs/jsonValue"
    )
    assert properties["results"]["additionalProperties"]["$ref"] == (
        "#/$defs/jsonValue"
    )
    assert properties["provenance"]["additionalProperties"]["$ref"] == (
        "#/$defs/jsonValue"
    )
