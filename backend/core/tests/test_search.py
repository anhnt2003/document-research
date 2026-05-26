import pytest
from httpx import ASGITransport, AsyncClient

from core.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_search_returns_empty_list_when_query_is_blank(client: AsyncClient) -> None:
    response = await client.post("/search", json={"query": ""})

    assert response.status_code == 200
    assert response.json() == {"results": []}


async def test_search_returns_empty_list_when_query_is_whitespace_only(
    client: AsyncClient,
) -> None:
    response = await client.post("/search", json={"query": "   "})

    assert response.status_code == 200
    assert response.json() == {"results": []}


async def test_search_returns_matching_documents_when_query_is_non_blank(
    client: AsyncClient,
) -> None:
    response = await client.post("/search", json={"query": "rfc"})

    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) >= 1
    first = body["results"][0]
    assert "id" in first
    assert "title" in first
