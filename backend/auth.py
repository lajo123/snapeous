"""Supabase JWT authentication dependency for FastAPI.

Uses the JWKS endpoint to automatically fetch and cache public keys,
supporting both ECC (ES256) and legacy HS256 algorithms.
"""

import logging
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import settings

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()

# JWKS client — fetches public keys from Supabase and caches them (5 min)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        logger.info(f"Initializing JWKS client with URL: {jwks_url}")
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=300)
    return _jwks_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Validate Supabase JWT and return the user id (sub claim).

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured",
        )

    try:
        # Fetch the signing key from JWKS endpoint
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT InvalidTokenError: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )
    except Exception as e:
        logger.error(f"JWT verification error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {type(e).__name__}: {e}",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing sub",
        )

    return user_id
