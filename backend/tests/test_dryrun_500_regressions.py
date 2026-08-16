"""Regression tests for the §3 dry-run 500 fixes.

Two genuine INT_001 (HTTP 500) bugs surfaced during the dry-run feature check:
  1. POST /corporate/employees crashed with TypeError: create_employee() missing
     required positional argument: 'db' — the endpoint forgot to pass the session.
  2. create_student (and other create flows) crashed AFTER commit in the in-app
     notification loop: Notification.school_id is NOT NULL but send_notification()
     never set it (psycopg2.errors.NotNullViolation), so the API returned 500 even
     though the student row was committed. exam-result / report-card / invoice then
     failed because the response carried no student id.
Also covered: _alert_new_device imported send_notification from app.core.notifications
which has no such function (ImportError on new-device login).
"""
import pytest
from unittest.mock import MagicMock, patch, ANY


class TestCorporateCreateEmployeeEndpoint:
    def test_endpoint_passes_db_to_service(self):
        """Regression: create_employee called the service WITHOUT db -> TypeError -> 500."""
        from app.api.v1.endpoints.corporate import create_employee

        data = MagicMock()
        data.model_dump.return_value = {
            "full_name": "Corp Admin",
            "email": "corpadmin@zenova.app",
            "user_id": "user-1",
            "department_id": "dept-1",
            "position": "Manager",
        }
        user = MagicMock()
        user.id = "user-9"

        emp = MagicMock()
        emp.department = MagicMock()
        emp.department.name = "Operations"

        with patch("app.api.v1.endpoints.corporate.corporate_service.create_employee", return_value=emp) as m, \
             patch("app.api.v1.endpoints.corporate._employee_to_response", return_value=emp):
            create_employee(data=data, db=object(), current_user=user)

        assert m.call_args.kwargs.get("db") is not None
        assert m.call_args.kwargs.get("created_by") == "user-9"
        assert m.call_args.kwargs.get("full_name") == "Corp Admin"


class TestSendNotificationSchoolId:
    def test_send_notification_sets_school_id(self):
        """Regression: Notification.school_id NOT NULL but never populated -> 500 after commit."""
        from app.services.communication_service import send_notification

        db = MagicMock()
        n = MagicMock()
        db.add.return_value = None
        db.refresh.return_value = None

        with patch("app.services.communication_service.Notification", return_value=n) as m, \
             patch("app.services.notification_manager.notification_manager.push"):
            send_notification(
                db, "user-1", "New Student", "Alice enrolled",
                notification_type="student_enrolled",
                reference_type="student", reference_id="student-1",
                school_id="school-1",
            )

        m.assert_called_once_with(
            user_id="user-1", title="New Student", message="Alice enrolled",
            notification_type="student_enrolled",
            reference_type="student", reference_id="student-1",
            school_id="school-1",
        )

    def test_send_notification_without_school_does_not_crash_on_add(self):
        """Defensive: caller may omit school_id (super-admin/system) — column is nullable now."""
        from app.services.communication_service import send_notification

        db = MagicMock()
        n = MagicMock()
        db.refresh.return_value = None

        with patch("app.services.communication_service.Notification", return_value=n) as m, \
             patch("app.services.notification_manager.notification_manager.push"):
            send_notification(db, "user-1", "Alert", "msg")

        m.assert_called_once_with(
            user_id="user-1", title="Alert", message="msg",
            notification_type=None, reference_type=None, reference_id=None,
            school_id=None,
        )


class TestAlertNewDevice:
    def test_uses_communication_service_not_core(self):
        """Regression: imported from app.core.notifications which has no send_notification."""
        from app.services.communication_service import send_notification
        import inspect

        src = inspect.getsource(send_notification)
        assert "school_id" in src


    def test_alert_new_device_passes_school_id(self):
        from app.api.v1.endpoints.auth import _alert_new_device

        db = MagicMock()
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        db.query.return_value.filter.return_value.first.return_value = user
        request = MagicMock()
        request.headers.get.return_value = "UA"

        with patch("app.services.communication_service.send_notification") as m:
            _alert_new_device(db, "user-1", "fp1234", "10.0.0.1", request)

        m.assert_called_once()
        assert m.call_args.kwargs.get("school_id") == "school-1"
