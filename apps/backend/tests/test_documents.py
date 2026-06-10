from fastapi.testclient import TestClient

from chemsmart_gui.main import app


client = TestClient(app)
WATER_STRUCTURE_ID = (
    "102b86d024728b9b902fb38c1b108f09e06311db6154a021419913cc2be81082"
)


def test_open_document_returns_molecule_document() -> None:
    response = client.post(
        "/api/documents/open",
        json={"path": "sample-data/water.xyz"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == WATER_STRUCTURE_ID
    assert body["name"] == "str-H2O-102b86d02472"
    assert body["coordinate_unit"] == "angstrom"
    assert body["charge"] is None
    assert body["multiplicity"] is None
    assert [atom["index"] for atom in body["atoms"]] == [1, 2, 3]
    assert len(body["atoms"]) == 3
    assert len(body["bonds"]) == 2


def test_get_document_returns_existing_document() -> None:
    client.post("/api/documents/open", json={"path": "sample-data/water.xyz"})

    response = client.get(f"/api/documents/{WATER_STRUCTURE_ID}")

    assert response.status_code == 200
    assert response.json()["id"] == WATER_STRUCTURE_ID
