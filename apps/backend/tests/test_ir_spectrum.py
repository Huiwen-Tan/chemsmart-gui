import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from chemsmart_gui.domain.document import (
    CalculationMetadata,
    DocumentSource,
    MoleculeDocument,
)
from chemsmart_gui.domain.molecule import Atom, Bond, VibrationalMode
from chemsmart_gui.domain.spectrum import BroadenedIrSpectrumRequest
from chemsmart_gui.main import app
from chemsmart_gui.services.ir_spectrum_service import IrSpectrumService

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
            Atom(index=1, element="O", x=0.0, y=0.0, z=0.0),
            Atom(index=2, element="H", x=1.0, y=0.0, z=0.0),
        ],
        bonds=[Bond(atom1=1, atom2=2)],
        vibrational_modes=[
            VibrationalMode(
                index=1,
                frequency_cm_minus_1=1000.0,
                is_imaginary=False,
                ir_intensity_km_per_mol=10.0,
            ),
            VibrationalMode(
                index=2,
                frequency_cm_minus_1=1100.0,
                is_imaginary=False,
                ir_intensity_km_per_mol=None,
            ),
            VibrationalMode(
                index=3,
                frequency_cm_minus_1=1200.0,
                is_imaginary=False,
                ir_intensity_km_per_mol=5.0,
            ),
        ],
    )


def test_preview_broadened_ir_spectrum_returns_gaussian_points() -> None:
    request = BroadenedIrSpectrumRequest(
        document=make_vibrational_document(),
        broadening="gaussian",
        width_cm_minus_1=10.0,
        point_count=5,
    )

    response = IrSpectrumService().preview_broadened_ir_spectrum(request)

    assert response.broadening == "gaussian"
    assert response.width_cm_minus_1 == 10.0
    assert response.point_count == 5
    assert response.frequency_unit == "cm^-1"
    assert response.intensity_unit == "km/mol"
    assert [peak.mode_index for peak in response.peaks] == [1, 3]
    assert [
        point.wavenumber_cm_minus_1 for point in response.points
    ] == pytest.approx([950.0, 1025.0, 1100.0, 1175.0, 1250.0])
    assert response.points[0].intensity_km_per_mol == pytest.approx(
        0.00003726653172078671,
    )
    assert response.points[2].intensity_km_per_mol == pytest.approx(0.0)
    assert response.points[3].intensity_km_per_mol == pytest.approx(
        0.2196846681170371,
    )


def test_preview_broadened_ir_spectrum_supports_lorentzian() -> None:
    request = BroadenedIrSpectrumRequest(
        document=make_vibrational_document(),
        broadening="lorentzian",
        width_cm_minus_1=10.0,
        point_count=5,
    )

    response = IrSpectrumService().preview_broadened_ir_spectrum(request)

    assert response.broadening == "lorentzian"
    assert response.points[0].intensity_km_per_mol == pytest.approx(
        0.392602605062669,
    )
    assert response.points[3].intensity_km_per_mol == pytest.approx(
        0.7222019584186752,
    )


def test_preview_broadened_ir_spectrum_rejects_no_ir_peaks() -> None:
    source_document = make_vibrational_document()
    document = source_document.model_copy(
        update={
            "vibrational_modes": [
                mode.model_copy(update={"ir_intensity_km_per_mol": None})
                for mode in source_document.vibrational_modes
            ]
        }
    )
    request = BroadenedIrSpectrumRequest(document=document)

    with pytest.raises(ValueError, match="No positive"):
        IrSpectrumService().preview_broadened_ir_spectrum(request)


@pytest.mark.parametrize(
    "payload",
    [
        {"broadening": "voigt", "width_cm_minus_1": 10.0, "point_count": 5},
        {"broadening": "gaussian", "width_cm_minus_1": 0.0, "point_count": 5},
        {"broadening": "gaussian", "width_cm_minus_1": 10.0, "point_count": 1},
    ],
)
def test_broadened_ir_spectrum_request_validates_contract(
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        BroadenedIrSpectrumRequest(
            document=make_vibrational_document(),
            **payload,
        )


def test_preview_broadened_ir_spectrum_api_returns_points() -> None:
    document = make_vibrational_document()

    response = client.post(
        "/api/documents/ir-spectrum-preview",
        json={
            "document": document.model_dump(),
            "broadening": "gaussian",
            "width_cm_minus_1": 10.0,
            "point_count": 5,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["broadening"] == "gaussian"
    assert body["width_cm_minus_1"] == 10.0
    assert body["point_count"] == 5
    assert body["peaks"][0]["mode_index"] == 1
    assert body["peaks"][1]["mode_index"] == 3
    assert len(body["points"]) == 5


@pytest.mark.parametrize(
    ("path", "program", "expected_modes"),
    [
        (
            "sample-data/water.log",
            "gaussian",
            [
                (1, 1628.3334, 71.6875),
                (2, 3821.7812, 5.5605),
                (3, 3947.6507, 75.4856),
            ],
        ),
        (
            "sample-data/water.out",
            "orca",
            [
                (1, 1625.35, 64.27),
                (2, 3875.61, 15.0),
                (3, 3971.9, 50.03),
            ],
        ),
    ],
)
def test_preview_broadened_ir_spectrum_api_accepts_output_fixtures(
    path: str,
    program: str,
    expected_modes: list[tuple[int, float, float]],
) -> None:
    open_response = client.post(
        "/api/documents/open",
        json={"path": path},
    )

    assert open_response.status_code == 200
    opened_document = open_response.json()
    assert opened_document["calculation"]["program"] == program
    final_frame = opened_document["frames"][-1]
    assert len(final_frame["vibrational_modes"]) == len(expected_modes)
    for mode, expected_mode in zip(
        final_frame["vibrational_modes"],
        expected_modes,
        strict=True,
    ):
        expected_index, expected_frequency, expected_intensity = expected_mode
        assert mode["index"] == expected_index
        assert mode["frequency_cm_minus_1"] == pytest.approx(expected_frequency)
        assert mode["ir_intensity_km_per_mol"] == pytest.approx(
            expected_intensity
        )

    spectrum_response = client.post(
        "/api/documents/ir-spectrum-preview",
        json={
            "document": final_frame,
            "broadening": "gaussian",
            "width_cm_minus_1": 20.0,
            "point_count": 7,
        },
    )

    assert spectrum_response.status_code == 200
    spectrum = spectrum_response.json()
    assert spectrum["broadening"] == "gaussian"
    assert spectrum["width_cm_minus_1"] == 20.0
    assert spectrum["point_count"] == 7
    assert len(spectrum["peaks"]) == len(expected_modes)
    assert len(spectrum["points"]) == 7
    assert [peak["mode_index"] for peak in spectrum["peaks"]] == [
        expected_mode[0] for expected_mode in expected_modes
    ]
    assert [
        peak["frequency_cm_minus_1"] for peak in spectrum["peaks"]
    ] == pytest.approx([expected_mode[1] for expected_mode in expected_modes])
    assert all(
        point["intensity_km_per_mol"] >= 0
        for point in spectrum["points"]
    )


def test_preview_broadened_ir_spectrum_api_reports_service_errors() -> None:
    document = make_vibrational_document().model_copy(
        update={"vibrational_modes": []}
    )

    response = client.post(
        "/api/documents/ir-spectrum-preview",
        json={"document": document.model_dump()},
    )

    assert response.status_code == 400
    assert "No positive" in response.json()["detail"]


def test_preview_broadened_ir_spectrum_api_rejects_invalid_contract() -> None:
    response = client.post(
        "/api/documents/ir-spectrum-preview",
        json={
            "document": make_vibrational_document().model_dump(),
            "broadening": "gaussian",
            "width_cm_minus_1": 10.0,
            "point_count": 1,
        },
    )

    assert response.status_code == 422
