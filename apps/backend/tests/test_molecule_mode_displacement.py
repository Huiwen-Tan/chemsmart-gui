import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from chemsmart_gui.domain.displacement import (
    MoleculeModeDisplacementRequest,
)
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
from chemsmart_gui.main import app
from chemsmart_gui.services.molecule_displacement_service import (
    MoleculeDisplacementService,
)

client = TestClient(app)


def make_vibrational_document() -> MoleculeDocument:
    return MoleculeDocument(
        id="input-vibrational-document",
        name="input-vibrational-document",
        document_kind="structure",
        source=DocumentSource(
            path="sample-data/water.log",
            filename="water.log",
            filetype="log",
        ),
        calculation=CalculationMetadata(
            program="gaussian",
            normal_termination=True,
        ),
        coordinate_unit="angstrom",
        charge=0,
        multiplicity=1,
        atoms=[
            Atom(index=1, element="C", x=0.0, y=0.0, z=0.0),
            Atom(index=2, element="H", x=1.0, y=0.0, z=0.0),
        ],
        bonds=[Bond(atom1=1, atom2=2)],
        frozen_atom_indices=[2],
        vibrational_modes=[
            VibrationalMode(
                index=1,
                frequency_cm_minus_1=-530.2,
                is_imaginary=True,
                reduced_mass_amu=1.2,
                force_constant_mdyne_per_angstrom=0.3,
                ir_intensity_km_per_mol=12.3,
                symmetry="A1",
                displacements=[
                    VibrationalDisplacement(
                        atom_index=1,
                        x=0.1,
                        y=0.0,
                        z=0.0,
                    ),
                    VibrationalDisplacement(
                        atom_index=2,
                        x=-0.1,
                        y=0.2,
                        z=0.0,
                    ),
                ],
            ),
            VibrationalMode(
                index=2,
                frequency_cm_minus_1=1628.0,
                is_imaginary=False,
                displacements=[],
            ),
        ],
    )


def test_generate_positive_mode_displacement_returns_new_structure() -> None:
    document = make_vibrational_document()
    request = MoleculeModeDisplacementRequest(
        document=document,
        mode_index=1,
        direction="positive",
        amplitude=2.0,
    )

    response = MoleculeDisplacementService().generate_mode_displacement(
        request,
    )

    assert response.mode_index == 1
    assert response.direction == "positive"
    assert response.amplitude == 2.0
    assert response.document.id != document.id
    assert response.document.name.startswith("str-")
    assert response.document.source is None
    assert response.document.calculation is None
    assert response.document.vibrational_modes == []
    assert response.document.charge == 0
    assert response.document.multiplicity == 1
    assert response.document.bonds == document.bonds
    assert response.document.frozen_atom_indices == [2]
    assert [
        (atom.index, atom.element) for atom in response.document.atoms
    ] == [
        (1, "C"),
        (2, "H"),
    ]
    assert [(atom.x, atom.y, atom.z) for atom in response.document.atoms] == (
        pytest.approx(
            [
                (0.2, 0.0, 0.0),
                (0.8, 0.4, 0.0),
            ],
        )
    )
    assert document.atoms[0].x == 0.0
    assert document.atoms[1].x == 1.0


def test_generate_negative_mode_displacement_uses_opposite_sign() -> None:
    document = make_vibrational_document()
    request = MoleculeModeDisplacementRequest(
        document=document,
        mode_index=1,
        direction="negative",
        amplitude=0.5,
    )

    response = MoleculeDisplacementService().generate_mode_displacement(
        request,
    )

    assert [(atom.x, atom.y, atom.z) for atom in response.document.atoms] == (
        pytest.approx(
            [
                (-0.05, 0.0, 0.0),
                (1.05, -0.1, 0.0),
            ],
        )
    )


def test_generate_mode_displacement_rejects_missing_mode() -> None:
    request = MoleculeModeDisplacementRequest(
        document=make_vibrational_document(),
        mode_index=99,
        direction="positive",
        amplitude=1.0,
    )

    with pytest.raises(ValueError, match="Vibrational mode 99"):
        MoleculeDisplacementService().generate_mode_displacement(request)


def test_generate_mode_displacement_rejects_mode_without_vectors() -> None:
    request = MoleculeModeDisplacementRequest(
        document=make_vibrational_document(),
        mode_index=2,
        direction="positive",
        amplitude=1.0,
    )

    with pytest.raises(ValueError, match="has no displacement vectors"):
        MoleculeDisplacementService().generate_mode_displacement(request)


def test_generate_mode_displacement_requires_supported_direction() -> None:
    with pytest.raises(ValidationError):
        MoleculeModeDisplacementRequest(
            document=make_vibrational_document(),
            mode_index=1,
            direction="forward",
            amplitude=1.0,
        )


def test_generate_mode_displacement_requires_positive_amplitude() -> None:
    with pytest.raises(ValidationError):
        MoleculeModeDisplacementRequest(
            document=make_vibrational_document(),
            mode_index=1,
            direction="positive",
            amplitude=0.0,
        )


def test_generate_mode_displacement_api_returns_and_stores_document() -> None:
    document = make_vibrational_document()

    response = client.post(
        "/api/documents/mode-displacement",
        json={
            "document": document.model_dump(),
            "mode_index": 1,
            "direction": "positive",
            "amplitude": 1.0,
        },
    )

    assert response.status_code == 200
    body = response.json()
    generated_document = body["document"]
    assert body["mode_index"] == 1
    assert body["direction"] == "positive"
    assert body["amplitude"] == 1.0
    assert generated_document["source"] is None
    assert generated_document["calculation"] is None
    assert generated_document["vibrational_modes"] == []
    generated_coordinates = [
        (atom["x"], atom["y"], atom["z"])
        for atom in generated_document["atoms"]
    ]
    assert generated_coordinates == pytest.approx(
        [
            (0.1, 0.0, 0.0),
            (0.9, 0.2, 0.0),
        ],
    )

    stored_response = client.get(f"/api/documents/{generated_document['id']}")

    assert stored_response.status_code == 200
    assert stored_response.json()["id"] == generated_document["id"]


def test_generate_mode_displacement_api_reports_service_errors() -> None:
    response = client.post(
        "/api/documents/mode-displacement",
        json={
            "document": make_vibrational_document().model_dump(),
            "mode_index": 2,
            "direction": "positive",
            "amplitude": 1.0,
        },
    )

    assert response.status_code == 400
    assert "has no displacement vectors" in response.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [
        {"mode_index": 1, "direction": "forward", "amplitude": 1.0},
        {"mode_index": 1, "direction": "positive", "amplitude": 0.0},
    ],
)
def test_generate_mode_displacement_api_rejects_invalid_contract(
    payload: dict[str, object],
) -> None:
    response = client.post(
        "/api/documents/mode-displacement",
        json={
            "document": make_vibrational_document().model_dump(),
            **payload,
        },
    )

    assert response.status_code == 422
