from fastapi.testclient import TestClient

from chemsmart_gui.main import app


client = TestClient(app)


def test_open_document_returns_molecule_document() -> None:
    response = client.post("/api/documents/open", json={"path": "sample-data/water.xyz"})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "water"
    assert body["name"] == "Water"
    assert len(body["atoms"]) == 3
    assert len(body["bonds"]) == 2


def test_get_document_returns_existing_document() -> None:
    client.post("/api/documents/open", json={"path": "sample-data/water.xyz"})

    response = client.get("/api/documents/water")

    assert response.status_code == 200
    assert response.json()["id"] == "water"
