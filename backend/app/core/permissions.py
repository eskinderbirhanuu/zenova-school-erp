from fastapi import Depends, HTTPException, status
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.core.server_identity import get_server_identity


class Permission:
    STUDENT_CREATE = "students.create"
    STUDENT_EDIT = "students.edit"
    STUDENT_DELETE = "students.delete"
    STUDENT_VIEW = "students.view"
    PARENT_CREATE = "parents.create"
    PARENT_EDIT = "parents.edit"
    TEACHER_CREATE = "teachers.create"
    STAFF_CREATE = "staff.create"
    FINANCE_ENTRY = "finance.journal.create"
    FINANCE_REPORTS = "finance.reports.view"
    HR_MANAGE = "hr.manage"
    INVENTORY_MANAGE = "inventory.manage"
    LIBRARY_MANAGE = "library.manage"
    CAFETERIA_POS = "cafeteria.pos"
    AUDIT_VIEW = "audit.view"
    SETTINGS_MANAGE = "settings.manage"
    LICENSE_MANAGE = "licenses.manage"
    SCHOOL_MANAGE = "schools.manage"


# Backward-compat alias
RolePermission = Permission


_ROLE_PERMISSION_VALUES = [
    v for v in vars(Permission).values()
    if isinstance(v, str) and "." in v
]

ROLE_PERMISSIONS = {
    "SUPER_ADMIN": _ROLE_PERMISSION_VALUES,
    "ADMIN": [
        Permission.STUDENT_CREATE, Permission.STUDENT_EDIT, Permission.STUDENT_VIEW,
        Permission.PARENT_CREATE, Permission.PARENT_EDIT,
        Permission.TEACHER_CREATE, Permission.STAFF_CREATE,
        Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS,
        Permission.HR_MANAGE, Permission.INVENTORY_MANAGE,
        Permission.LIBRARY_MANAGE, Permission.CAFETERIA_POS,
        Permission.AUDIT_VIEW, Permission.SETTINGS_MANAGE,
    ],
    "DIRECTOR": [
        Permission.STUDENT_VIEW, Permission.STUDENT_CREATE,
        Permission.PARENT_CREATE, Permission.PARENT_EDIT,
        Permission.TEACHER_CREATE, Permission.STAFF_CREATE,
        Permission.FINANCE_REPORTS, Permission.AUDIT_VIEW,
    ],
    "REGISTRAR": [
        Permission.STUDENT_CREATE, Permission.STUDENT_EDIT, Permission.STUDENT_VIEW,
        Permission.PARENT_CREATE, Permission.PARENT_EDIT,
        Permission.AUDIT_VIEW,
    ],
    "TEACHER": [Permission.STUDENT_VIEW],
    "FINANCE": [Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS],
    "HR": [Permission.HR_MANAGE],
    "INVENTORY": [Permission.INVENTORY_MANAGE],
    "LIBRARY": [Permission.LIBRARY_MANAGE],
    "CAFETERIA": [Permission.CAFETERIA_POS],
    "AUDITOR": [Permission.AUDIT_VIEW],
}


def has_permission(user: User, permission: str) -> bool:
    if user.is_superuser:
        return True
    if user.is_view_only and permission not in ["students.view", "audit.view"]:
        return False
    if not user.role:
        return False
    return permission in ROLE_PERMISSIONS.get(user.role.name, [])


def require_permission(*permissions: str):
    """Require the current user to have at least one of the given permissions.

    Can be used as a parameter injection (``current_user: User = Depends(...)``)
    or as a router dependency (``dependencies=[...]``).
    """
    def _check(current_user: User = Depends(get_current_user)):
        if not permissions:
            return current_user
        for perm in permissions:
            if has_permission(current_user, perm):
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing one of: {', '.join(permissions)}",
        )
    return Depends(_check)


def require_role(*role_names: str):
    """Require the current user to have at least one of the given role names.

    Prefer ``require_permission()`` for new code; this function exists for
    coarse-grained checks where role-name comparison is sufficient.
    """
    def _check(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user
        if current_user.is_view_only:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="View-only mode: mutations are disabled outside the school network",
            )
        if not current_user.role or current_user.role.name not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(role_names)}",
            )
        return current_user
    return Depends(_check)


class PermissionChecker:
    """Deprecated: Use ``require_permission()`` instead."""

    def __init__(self, permission: str):
        self.permission = permission

    def __call__(self, current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {self.permission}",
            )
        return current_user


def require_server_role(*allowed_roles: str):
    """Require this deployment to be one of the given server roles.

    Checks the on-disk ``server_id.json`` to determine the current
    deployment's role.  Raises 503 if the server hasn't been initialized
    yet, 403 if the role doesn't match.
    """
    identity = get_server_identity()
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server not initialized — run the installer first",
        )
    if identity["server_role"] not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Server role '{identity['server_role']}' not allowed (requires {', '.join(allowed_roles)})",
        )
