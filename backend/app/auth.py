from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

try:
    import firebase_admin
    from firebase_admin import auth as fb_auth
except ImportError:  # pragma: no cover - exercised when firebase-admin is absent
    firebase_admin = None
    fb_auth = None

# Allow missing Authorization header in dev: auto_error=False
security = HTTPBearer(auto_error=False)


def _dev_user() -> dict:
    return {"uid": "dev_user", "email": "dev@localhost", "name": "Dev User", "is_anonymous": True}


def _firebase_initialized() -> bool:
    if firebase_admin is None or fb_auth is None:
        return False
    try:
        return bool(getattr(firebase_admin, "_apps", None))
    except Exception:
        return False


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Dependency to verify a Firebase ID token when Firebase is initialized.
    When no token is provided (or Firebase isn't configured) this returns
    a lightweight development user so the app can be used without login.
    If a token is provided and Firebase is initialized, the token is verified
    and the decoded user is returned. Verification errors raise 401.
    """
    # No token provided — return a dev user for local/dev usage
    if credentials is None or not getattr(credentials, "credentials", None):
        return _dev_user()

    token = credentials.credentials

    # If Firebase isn't available or isn't initialized, allow dev access
    if not _firebase_initialized():
        return _dev_user()

    # Firebase is initialized and a token was provided — verify it
    try:
        decoded_token = fb_auth.verify_id_token(token, check_revoked=True)
        return decoded_token
    except fb_auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except fb_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except fb_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication server error: {str(e)}",
        )
