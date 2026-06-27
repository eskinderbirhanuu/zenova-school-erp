from fastapi import Depends, HTTPException, status
from app.api.v1.deps import get_current_user
from app.models.user import User


class RolePermission:
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


ROLE_PERMISSIONS = {
    "SUPER_ADMIN": [f for f in dir(RolePermission) if not f.startswith("_")],
    "ADMIN": [
        RolePermission.STUDENT_CREATE, RolePermission.STUDENT_EDIT, RolePermission.STUDENT_VIEW,
        RolePermission.PARENT_CREATE, RolePermission.PARENT_EDIT,
        RolePermission.TEACHER_CREATE, RolePermission.STAFF_CREATE,
        RolePermission.FINANCE_ENTRY, RolePermission.FINANCE_REPORTS,
        RolePermission.HR_MANAGE, RolePermission.INVENTORY_MANAGE,
        RolePermission.LIBRARY_MANAGE, RolePermission.CAFETERIA_POS,
        RolePermission.AUDIT_VIEW, RolePermission.SETTINGS_MANAGE,
    ],
    "DIRECTOR": [
        RolePermission.STUDENT_VIEW, RolePermission.STUDENT_CREATE,
        RolePermission.PARENT_CREATE, RolePermission.PARENT_EDIT,
        RolePermission.TEACHER_CREATE, RolePermission.STAFF_CREATE,
        RolePermission.FINANCE_REPORTS, RolePermission.AUDIT_VIEW,
    ],
    "REGISTRAR": [
        RolePermission.STUDENT_CREATE, RolePermission.STUDENT_EDIT, RolePermission.STUDENT_VIEW,
        RolePermission.PARENT_CREATE, RolePermission.PARENT_EDIT,
        RolePermission.AUDIT_VIEW,
    ],
    "TEACHER": [RolePermission.STUDENT_VIEW],
    "FINANCE": [RolePermission.FINANCE_ENTRY, RolePermission.FINANCE_REPORTS],
    "HR": [RolePermission.HR_MANAGE],
    "INVENTORY": [RolePermission.INVENTORY_MANAGE],
    "LIBRARY": [RolePermission.LIBRARY_MANAGE],
    "CAFETERIA": [RolePermission.CAFETERIA_POS],
    "AUDITOR": [RolePermission.AUDIT_VIEW],
}


def has_permission(user: User, permission: str) -> bool:
    if user.is_superuser:
        return True
    if user.is_view_only and permission not in ["students.view", "audit.view"]:
        return False
    if not user.role:
        return False
    role_perms = ROLE_PERMISSIONS.get(user.role.name, [])
    return permission in role_perms


class PermissionChecker:
    def __init__(self, permission: str):
        self.permission = permission

    def __call__(self, current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {self.permission}",
            )
        return current_user


def require_role(role_name: str):
    def _check_role(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user
        if not current_user.role or current_user.role.name != role_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {role_name}",
            )
        return current_user
    return Depends(_check_role)
