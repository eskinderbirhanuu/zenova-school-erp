"""API dependency injection — re-exports from core/ modules for backward compatibility.

New code should import directly from the core modules:
  - ``app.core.auth_deps`` for ``get_current_user``, ``get_client_ip``, etc.
  - ``app.core.rate_limit`` for ``rate_limit``, ``API_RATE_LIMIT``, etc.
"""
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth_deps import (
    get_current_user,
    get_client_ip,
    get_user_agent,
    require_csrf,
    require_licensed_feature,
    require_inside_network,
)
from app.core.rate_limit import (
    rate_limit_key,
    rate_limit,
    AUTH_RATE_LIMIT,
    LOGIN_RATE_LIMIT,
    API_RATE_LIMIT,
)
