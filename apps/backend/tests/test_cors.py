import pytest
from fastapi.testclient import TestClient

from chemsmart_gui.main import app


client = TestClient(app)


@pytest.mark.parametrize(
    "origin",
    [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)
def test_local_frontend_origin_can_access_backend(origin: str) -> None:
    health_response = client.get("/api/health", headers={"Origin": origin})

    assert health_response.status_code == 200
    assert health_response.headers["access-control-allow-origin"] == origin

    preflight_response = client.options(
        "/api/documents/open",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert preflight_response.status_code == 200
    assert preflight_response.headers["access-control-allow-origin"] == origin
    assert "POST" in preflight_response.headers["access-control-allow-methods"]


def test_other_origins_are_not_allowed() -> None:
    response = client.options(
        "/api/documents/open",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
