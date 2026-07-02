"""Tests for RBAC — permission definitions, role mappings, has_permission."""
from unittest.mock import MagicMock
import pytest
from app.core.permissions import Permission, ROLE_PERMISSIONS, has_permission


class TestPermissionDefinitions:
    def test_all_permissions_are_strings_with_dot(self):
        for name in dir(Permission):
            if name.startswith("_"):
                continue
            val = getattr(Permission, name)
            if callable(val):
                continue
            assert isinstance(val, str)
            assert "." in val

    def test_super_admin_has_all_permissions(self):
        all_perms = [v for v in vars(Permission).values() if isinstance(v, str) and "." in v]
        assert set(ROLE_PERMISSIONS["SUPER_ADMIN"]) == set(all_perms)

    def test_admin_has_subset(self):
        assert set(ROLE_PERMISSIONS["ADMIN"]).issubset(set(ROLE_PERMISSIONS["SUPER_ADMIN"]))

    def test_role_keys_are_uppercase(self):
        for role in ROLE_PERMISSIONS:
            assert role == role.upper()


class TestHasPermission:
    def test_superuser_has_all_permissions(self):
        user = MagicMock()
        user.is_superuser = True
        user.role.name = "STAFF"

        assert has_permission(user, Permission.LICENSE_MANAGE) is True

    def test_admin_has_assigned_permission(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_view_only = False
        user.role.name = "ADMIN"

        assert has_permission(user, Permission.STUDENT_CREATE) is True

    def test_user_without_role_has_no_permissions(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_view_only = False
        user.role = None

        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_user_without_permission_returns_false(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_view_only = False
        user.role.name = "VIEWER"

        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_view_only_blocked_on_mutation(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_view_only = True
        user.role.name = "ADMIN"

        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_view_only_allowed_on_view(self):
        user = MagicMock()
        user.is_superuser = False
        user.is_view_only = True
        user.role.name = "ADMIN"

        assert has_permission(user, Permission.STUDENT_VIEW) is True
