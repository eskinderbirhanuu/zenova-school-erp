"""Tests for Corporate service — departments, employees, dashboard."""
from unittest.mock import MagicMock, patch, ANY
import pytest
from app.services import corporate_service


class TestCreateDepartment:
    def test_create_new_department(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        dept = corporate_service.create_department(db, "Engineering", "ENG", "Engineering dept", "user-1")
        assert dept.name == "Engineering"
        assert dept.code == "ENG"
        assert db.add.called
        assert db.commit.called

    def test_create_duplicate_name_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock()

        with pytest.raises(ValueError, match="already exists"):
            corporate_service.create_department(db, "Engineering", "ENG")


class TestCreateEmployee:
    def test_create_employee(self):
        db = MagicMock()
        # _generate_employee_id uses max
        from sqlalchemy import func
        scalar_mock = MagicMock()
        scalar_mock.scalar.return_value = "ZNV-EMP-000005"
        db.query.return_value = scalar_mock

        emp = corporate_service.create_employee(
            db=db, full_name="John Doe", email="john@zenova.com",
            user_id="user-123", department_id="dept-1",
            position="Engineer",
        )
        assert emp.full_name == "John Doe"
        assert emp.email == "john@zenova.com"
        assert emp.employee_id is not None
        assert emp.employee_id.startswith("ZNV-EMP-")
        assert db.add.called
        assert db.commit.called


class TestListEmployees:
    def test_list_employees(self):
        db = MagicMock()
        emp1, emp2 = MagicMock(), MagicMock()
        emp1.full_name = "Alice"
        emp2.full_name = "Bob"
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [emp1, emp2]
        db.query.return_value = mock_query

        employees = corporate_service.list_employees(db)
        assert len(employees) == 2


class TestDashboard:
    def test_dashboard_returns_structure(self):
        db = MagicMock()
        # Set up all query returns to self-chaining mocks
        q = MagicMock()
        q.filter.return_value = q
        q.outerjoin.return_value = q
        q.group_by.return_value = q
        q.count.return_value = 0
        q.all.return_value = []
        db.query.return_value = q

        result = corporate_service.get_dashboard(db)
        assert isinstance(result, dict)
        assert "total_employees" in result
        assert "active_employees" in result
        assert "department_count" in result
        assert "employees_by_department" in result
