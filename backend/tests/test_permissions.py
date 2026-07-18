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
    def _make_user(self, is_superuser=False, is_view_only=False, role_name=None):
        user = MagicMock()
        user.is_superuser = is_superuser
        user.is_view_only = is_view_only
        if role_name:
            user.role = MagicMock()
            user.role.name = role_name
            user.get_role_names.return_value = [role_name]
        else:
            user.role = None
            user.get_role_names.return_value = []
        return user

    def test_superuser_has_all_permissions(self):
        user = self._make_user(is_superuser=True, role_name="STAFF")
        assert has_permission(user, Permission.LICENSE_MANAGE) is True

    def test_admin_has_assigned_permission(self):
        user = self._make_user(role_name="ADMIN")
        assert has_permission(user, Permission.STUDENT_CREATE) is True

    def test_user_without_role_has_no_permissions(self):
        user = self._make_user()
        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_user_without_permission_returns_false(self):
        user = self._make_user(role_name="VIEWER")
        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_view_only_blocked_on_mutation(self):
        user = self._make_user(is_view_only=True, role_name="ADMIN")
        assert has_permission(user, Permission.STUDENT_CREATE) is False

    def test_view_only_allowed_on_view(self):
        user = self._make_user(is_view_only=True, role_name="ADMIN")
        assert has_permission(user, Permission.STUDENT_VIEW) is True
