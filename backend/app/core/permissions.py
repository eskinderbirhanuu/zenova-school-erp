from fastapi import Depends
from app.core.auth_deps import get_current_user
from app.models.user import User
from app.core.server_identity import get_server_identity
from app.core.exceptions import ForbiddenException, ServiceUnavailableException


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
    ATTENDANCE_MARK = "attendance.mark"
    AUDIT_VIEW = "audit.view"
    SETTINGS_MANAGE = "settings.manage"
    LICENSE_MANAGE = "licenses.manage"
    SCHOOL_MANAGE = "schools.manage"
    DEVICE_REVIEW = "licenses.device_review"

    # ZENOVA Corporate Permissions
    CORPORATE_EMPLOYEE_VIEW = "corporate.employee.view"
    CORPORATE_EMPLOYEE_CREATE = "corporate.employee.create"
    CORPORATE_EMPLOYEE_EDIT = "corporate.employee.edit"
    CORPORATE_DEPARTMENT_VIEW = "corporate.department.view"
    CORPORATE_DEPARTMENT_MANAGE = "corporate.department.manage"

    # Card Printing Permissions
    GRADE_ENTER = "grades.enter"
    CARD_PRINT = "card.print"
    CARD_PRINT_ASSIGN = "card.assign"
    CARD_PRINT_REPRINT = "card.reprint"

    # ZENOVA Corporate Finance
    CORPORATE_FINANCE_VIEW = "corporate.finance.view"
    CORPORATE_SETTINGS_MANAGE = "corporate.settings.manage"
    CORPORATE_DEPLOY = "corporate.deploy"
    INFRASTRUCTURE_VIEW = "infrastructure.view"


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
        Permission.INFRASTRUCTURE_VIEW,
        Permission.ATTENDANCE_MARK,
        Permission.CARD_PRINT, Permission.CARD_PRINT_ASSIGN,
        Permission.CORPORATE_EMPLOYEE_VIEW, Permission.CORPORATE_DEPARTMENT_VIEW,
        Permission.CORPORATE_DEPARTMENT_MANAGE, Permission.CORPORATE_FINANCE_VIEW,
    ],
    "DIRECTOR": [
        Permission.STUDENT_VIEW, Permission.STUDENT_CREATE,
        Permission.PARENT_CREATE, Permission.PARENT_EDIT,
        Permission.TEACHER_CREATE, Permission.STAFF_CREATE,
        Permission.FINANCE_REPORTS, Permission.AUDIT_VIEW,
        Permission.CARD_PRINT_ASSIGN,
        Permission.CORPORATE_EMPLOYEE_VIEW, Permission.CORPORATE_DEPARTMENT_VIEW,
    ],
    "REGISTRAR": [
        Permission.STUDENT_CREATE, Permission.STUDENT_EDIT, Permission.STUDENT_VIEW,
        Permission.PARENT_CREATE, Permission.PARENT_EDIT,
        Permission.AUDIT_VIEW,
    ],
    "TEACHER": [Permission.STUDENT_VIEW, Permission.GRADE_ENTER, Permission.ATTENDANCE_MARK],
    "FINANCE": [Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS],
    "HR": [Permission.HR_MANAGE, Permission.ATTENDANCE_MARK],
    "INVENTORY": [Permission.INVENTORY_MANAGE],
    "LIBRARY": [Permission.LIBRARY_MANAGE],
    "CAFETERIA": [Permission.CAFETERIA_POS],
    "AUDITOR": [Permission.AUDIT_VIEW],
    "ZENOVA_CARD_OFFICER": [
        Permission.CARD_PRINT, Permission.CARD_PRINT_ASSIGN, Permission.CARD_PRINT_REPRINT,
        Permission.STUDENT_VIEW, Permission.STAFF_CREATE,
        Permission.CORPORATE_EMPLOYEE_VIEW,
    ],
    "ZENOVA_CORPORATE_ADMIN": [
        Permission.CORPORATE_EMPLOYEE_VIEW, Permission.CORPORATE_EMPLOYEE_CREATE,
        Permission.CORPORATE_EMPLOYEE_EDIT, Permission.CORPORATE_DEPARTMENT_VIEW,
        Permission.CORPORATE_DEPARTMENT_MANAGE, Permission.CORPORATE_FINANCE_VIEW,
        Permission.CORPORATE_SETTINGS_MANAGE, Permission.CORPORATE_DEPLOY,
        Permission.AUDIT_VIEW,
    ],
    "ZENOVA_SUPPORT": [
        Permission.AUDIT_VIEW, Permission.STUDENT_VIEW,
        Permission.CORPORATE_EMPLOYEE_VIEW, Permission.CORPORATE_DEPARTMENT_VIEW,
    ],
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
        raise ForbiddenException(f"Missing one of: {', '.join(permissions)}")
    return Depends(_check)





def require_server_role(*allowed_roles: str):
    """Require this deployment to be one of the given server roles.

    Checks the on-disk ``server_id.json`` to determine the current
    deployment's role.  Raises 503 if the server hasn't been initialized
    yet, 403 if the role doesn't match.
    """
    identity = get_server_identity()
    if identity is None:
        raise ServiceUnavailableException("Server not initialized — run the installer first")
    if identity["server_role"] not in allowed_roles:
        raise ForbiddenException(f"Server role '{identity['server_role']}' not allowed (requires {', '.join(allowed_roles)})")
