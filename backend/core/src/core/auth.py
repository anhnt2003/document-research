import secrets
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import settings

_bearer = HTTPBearer(auto_error=False)


async def require_service_token(
    x_service_token: Annotated[str | None, Header()] = None,
) -> None:
    """Guard service-to-service endpoints (api -> core). Constant-time secret compare."""
    expected = settings.service_token
    if not x_service_token or not secrets.compare_digest(x_service_token, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid service token")


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> UUID:
    """Verify the HS256 JWT issued by backend/api and return the subject user id.

    The signature, issuer, audience and expiry are all validated — a spoofed or
    unsigned token (or a raw X-User-Id header) cannot pass.
    """
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc

    sub = payload.get("sub")
    try:
        return UUID(str(sub))
    except (ValueError, TypeError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject") from exc
