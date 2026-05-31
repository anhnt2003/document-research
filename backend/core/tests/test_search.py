from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from core.config import settings
from core.db import SessionLocal
from core.main import app
from core.models import Document, User


async def seed_user() -> UUID:
    user_id = uuid4()
    async with SessionLocal() as db:
        db.add(
            User(
                id=user_id,
                email=f"u-{user_id.hex}@example.com",
                display_name="U",
                status="active",
                created_at=datetime.now(UTC),
            )
        )
        await db.commit()
    return user_id


async def seed_document(owner_id: UUID, *, title: str, body: str = "") -> UUID:
    doc_id = uuid4()
    async with SessionLocal() as db:
        db.add(
            Document(
                id=doc_id,
                title=title,
                body=body,
                created_at=datetime.now(UTC),
                ingestion_status="Ready",
                owner_id=owner_id,
            )
        )
        await db.commit()
    return doc_id


def make_token(
    user_id: UUID,
    *,
    secret: str | None = None,
    issuer: str | None = None,
    audience: str | None = None,
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iss": issuer or settings.jwt_issuer,
        "aud": audience or settings.jwt_audience,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, secret or settings.jwt_secret, algorithm="HS256")


def auth(user_id: UUID, **kwargs: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(user_id, **kwargs)}"}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_search_requires_authentication(client: AsyncClient) -> None:
    response = await client.post("/search", json={"query": "rfc"})

    assert response.status_code == 401


async def test_search_rejects_token_signed_with_a_different_secret(client: AsyncClient) -> None:
    headers = auth(uuid4(), secret="attacker-forged-secret-not-the-real-one")

    response = await client.post("/search", json={"query": "rfc"}, headers=headers)

    assert response.status_code == 401


async def _search_ids(client: AsyncClient, user_id: UUID, query: str) -> list[str]:
    response = await client.post("/search", json={"query": query}, headers=auth(user_id))
    assert response.status_code == 200
    return [r["id"] for r in response.json()["results"]]


async def test_search_returns_owned_document_matching_query(client: AsyncClient) -> None:
    owner = await seed_user()
    marker = uuid4().hex
    doc_id = await seed_document(owner, title=f"RFC {marker}")

    assert str(doc_id) in await _search_ids(client, owner, marker)


async def test_search_hides_document_from_non_owner(client: AsyncClient) -> None:
    owner = await seed_user()
    outsider = await seed_user()
    marker = uuid4().hex
    doc_id = await seed_document(owner, title=f"Secret {marker}")

    assert str(doc_id) not in await _search_ids(client, outsider, marker)


async def test_search_returns_empty_for_blank_query(client: AsyncClient) -> None:
    user = await seed_user()

    response = await client.post("/search", json={"query": "   "}, headers=auth(user))

    assert response.status_code == 200
    assert response.json() == {"results": []}
