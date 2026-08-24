"""Tenant isolation context for multi-school security.

Provides a request-scoped context variable that holds the current
user's school_id. All service queries should check this context
to enforce row-level security.

Usage in endpoints:
    from app.core.tenant import get_current_school_id

    @router.get("/students")
    def list_students(ctx: AuthContext = Depends(get_auth_context)):
        school_id = get_current_school_id()
        students = db.query(Student).filter(Student.school_id == school_id).all()
        ...

Usage in middleware (automatic):
    The TenantMiddleware in main.py sets the context variable
    on every authenticated request.
"""

from contextvars import ContextVar
from typing import Optional

_current_school_id: ContextVar[Optional[str]] = ContextVar('current_school_id', default=None)
_current_user_id: ContextVar[Optional[str]] = ContextVar('current_user_id', default=None)
_current_is_superuser: ContextVar[bool] = ContextVar('current_is_superuser', default=False)


def get_current_school_id() -> Optional[str]:
    """Get the school_id of the current authenticated user."""
    return _current_school_id.get()


def get_current_user_id() -> Optional[str]:
    """Get the user_id of the current authenticated user."""
    return _current_user_id.get()


def is_superuser() -> bool:
    """Check if the current user is a superuser."""
    return _current_is_superuser.get()


def set_tenant_context(school_id: Optional[str], user_id: str, superuser: bool = False):
    """Set the tenant context for the current request."""
    _current_school_id.set(school_id)
    _current_user_id.set(user_id)
    _current_is_superuser.set(superuser)


def clear_tenant_context():
    """Clear the tenant context (called at end of request)."""
    _current_school_id.set(None)
    _current_user_id.set(None)
    _current_is_superuser.set(False)


def require_school_access(resource_school_id: Optional[str], allow_superuser: bool = True):
    """Verify the current user has access to a resource's school.
    
    Args:
        resource_school_id: The school_id of the resource being accessed.
        allow_superuser: If True, superusers can access any school's resources.
    
    Raises:
        ForbiddenException: If the user doesn't have access.
    """
    from app.core.exceptions import ForbiddenException
    
    current_school_id = get_current_school_id()
    
    # Superusers bypass school isolation (but access is logged)
    if allow_superuser and is_superuser():
        return
    
    # If no school context (e.g., system operations), allow
    if current_school_id is None:
        return
    
    # If resource has no school (global resource), allow
    if resource_school_id is None:
        return
    
    # School isolation check
    if current_school_id != resource_school_id:
        raise ForbiddenException(
            "Access denied: resource belongs to a different school"
        )
