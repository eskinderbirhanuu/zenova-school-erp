"""Tests for APU Phase 3 backend changes — report-card ownership gate (P1),
user-scoped notification/message reads (N1), and role-agnostic WS push (N3)."""
from unittest.mock import MagicMock, AsyncMock, patch
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.report_cards import (
    _resolve_accessible_student_ids,
    _require_card_access,
    list_report_cards,
    generate_report_card,
    get_report_card,
)
from app.api.v1.endpoints.communication import list_notifications, list_messages
from app.core.pagination import paginate


def _make_user(is_superuser=False, school_id="school-1", permissions=frozenset()):
    user = MagicMock()
    user.is_superuser = is_superuser
    user.school_id = school_id
    user.id = "user-1"
    return user


class TestReportCardAccess:
    """Gap P1 — PARENT/STUDENT must not read others' report cards."""

    def _student_user(self):
        return _make_user()

    def test_staff_view_all_returns_none(self):
        user = _make_user(permissions=frozenset({"students.view"}))
        db = MagicMock()
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=True):
            result = _resolve_accessible_student_ids(db, user)
        assert result is None

    def test_superuser_returns_none(self):
        db = MagicMock()
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            result = _resolve_accessible_student_ids(db, _make_user(is_superuser=True))
        assert result is None

    def test_student_self_is_accessible(self):
        user = _make_user()
        db = MagicMock()
        student = MagicMock()
        student.id = "student-1"
        db.query.return_value.filter.return_value.first.return_value = student
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            result = _resolve_accessible_student_ids(db, user)
        assert result == {"student-1"}

    def test_no_link_returns_empty(self):
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            result = _resolve_accessible_student_ids(db, user)
        assert result == set()

    def test_require_card_access_blocks_foreign_card(self):
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None  # no student/parent link
        card = MagicMock()
        card.student_id = "student-99"
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            with pytest.raises(HTTPException) as exc:
                _require_card_access(db, user, card)
        assert exc.value.status_code == 404

    def test_require_card_access_allows_own_card(self):
        user = _make_user()
        db = MagicMock()
        student = MagicMock()
        student.id = "student-1"
        db.query.return_value.filter.return_value.first.return_value = student
        card = MagicMock()
        card.student_id = "student-1"
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            _require_card_access(db, user, card)  # no raise

    def test_list_scopes_to_owned_students(self):
        user = _make_user()
        db = MagicMock()
        card = MagicMock(id="card-1", school_id="school-1", student_id="student-1",
                         semester_id="sem-1", academic_year_id="ay-1",
                         pdf_url=None, generated_at=None)
        q = MagicMock()
        q.filter.return_value = q
        q.order_by.return_value.all.return_value = [card]
        db.query.return_value = q
        with patch("app.api.v1.endpoints.report_cards._resolve_accessible_student_ids", return_value={"student-1"}):
            result = list_report_cards(student_id=None, semester_id=None, db=db, current_user=user)
        assert len(result) == 1
        assert result[0].id == "card-1"

    def test_generate_blocked_for_parent(self):
        user = _make_user()
        db = MagicMock()
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=False):
            with pytest.raises(HTTPException) as exc:
                generate_report_card(student_id="student-1", semester_id="sem-1", db=db, current_user=user)
        assert exc.value.status_code == 403

    def test_generate_allowed_for_staff(self):
        user = _make_user(permissions=frozenset({"students.view"}))
        db = MagicMock()
        student = MagicMock()
        student.id = "student-1"
        student.school_id = "school-1"
        student.first_name = "A"
        student.last_name = "B"
        student.student_id = "S1"
        semester = MagicMock()
        semester.id = "sem-1"
        semester.school_id = "school-1"
        semester.academic_year_id = "ay-1"
        semester.name = "Sem 1"
        card = MagicMock(id="card-1", generated_at=None, student_id="student-1")
        db.query.return_value.filter.return_value.first.side_effect = [student, semester, None, None]
        db.query.return_value.filter.return_value.all.return_value = []
        db.add.return_value = None
        with patch("app.api.v1.endpoints.report_cards.has_permission", return_value=True):
            with patch("app.api.v1.endpoints.report_cards.compute_subject_grades", return_value=([], 0, 0)):
                result = generate_report_card(student_id="student-1", semester_id="sem-1", db=db, current_user=user)
        assert result["id"]
        assert result["student_name"] == "A B"


class TestN1UserScopedReads:
    """Gap N1 — PARENT/STUDENT can read their own notifications/messages."""

    def test_list_notifications_scopes_by_user(self):
        user = _make_user()
        user.id = "parent-1"
        db = MagicMock()
        notification = {
            "id": "n-1", "user_id": "parent-1", "title": "t", "message": "m",
            "created_at": None, "is_read": False, "type": "info", "school_id": "school-1",
        }
        db.query.return_value.filter.return_value.order_by.return_value = db.query.return_value
        db.query.return_value.order_by.return_value.all.return_value = [notification]
        with patch("app.api.v1.endpoints.communication.paginate",
                   return_value=(MagicMock(all=lambda: [notification]), 1, 1, 50, 1)):
            result = list_notifications(unread_only=False, page=1, page_size=50, db=db, current_user=user)
        assert result.total == 1
        assert result.items[0].id == "n-1"

    def test_list_messages_scopes_by_recipient(self):
        user = _make_user()
        user.id = "student-1"
        db = MagicMock()
        message = MagicMock(id="m-1", sender_id="teacher-1", recipient_id="student-1",
                            subject="s", message="body", is_read=False, read_at=None,
                            sender_name="T", created_at=None)
        db.query.return_value.filter.return_value.order_by.return_value = db.query.return_value
        db.query.return_value.order_by.return_value.all.return_value = [message]
        db.query.return_value.filter.return_value.all.return_value = []
        with patch("app.api.v1.endpoints.communication.paginate",
                   return_value=(MagicMock(all=lambda: [message]), 1, 1, 50, 1)):
            result = list_messages(include_sent=False, page=1, page_size=50, db=db, current_user=user)
        assert result.total == 1
        assert result.items[0].id == "m-1"


class TestN3WsPushForAllRoles:
    """Gap N3 — WebSocket notification push must reach PARENT/STUDENT.

    The WS endpoint (`/ws/notifications`) is token-only: any user with a valid
    access token (role never checked) connects and receives pushes scoped by
    user_id. `send_notification` fans out via `notification_manager.push`
    keyed by recipient user_id — role-agnostic. N1 already unblocked the read
    side. These tests prove the push path carries a parent/student notification.
    """

    def test_send_notification_pushes_for_parent_user(self):
        from app.services.communication_service import send_notification
        db = MagicMock()
        n = MagicMock(id="n-1", title="Fee due", message="Pay now",
                      notification_type="finance", is_read=False, created_at=None)
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None
        db.query.return_value.filter.return_value.first.return_value = n
        push = AsyncMock()
        with patch("app.services.notification_manager.notification_manager") as mgr:
            mgr.push = push
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = send_notification(db, "parent-1", "Fee due", "Pay now",
                                           notification_type="finance", school_id="school-1")
                loop.run_until_complete(asyncio.sleep(0))
            finally:
                loop.close()
                asyncio.set_event_loop(None)
        assert result.title == "Fee due"
        assert result.user_id == "parent-1"
        assert push.call_count == 1
        args, _ = push.call_args
        assert args[0] == "parent-1"
        assert args[1]["title"] == "Fee due"

    def test_send_notification_push_failure_is_nonfatal(self):
        from app.services.communication_service import send_notification
        db = MagicMock()
        n = MagicMock(id="n-1", title="t", message="m",
                      notification_type="info", is_read=False, created_at=None)
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None
        db.query.return_value.filter.return_value.first.return_value = n
        with patch("app.services.notification_manager.notification_manager") as mgr:
            mgr.push.side_effect = RuntimeError("ws down")
            result = send_notification(db, "student-1", "t", "m",
                                       notification_type="info", school_id="school-1")
        assert result.user_id == "student-1"
        assert result.title == "t"

    def test_ws_endpoint_ignores_role(self):
        """The WS handler only validates token type + sub — no permission gate."""
        from unittest.mock import AsyncMock
        from app.api.v1.endpoints import ws as ws_module
        ws = MagicMock()
        ws.receive_text.side_effect = Exception("done")
        payload = {"type": "access", "sub": "student-1"}
        connect = AsyncMock()
        with patch.object(ws_module, "decode_access_token", return_value=payload):
            with patch.object(ws_module.notification_manager, "connect", connect):
                with patch.object(ws_module.notification_manager, "disconnect"):
                    import asyncio
                    async def run():
                        await ws_module.ws_notifications(ws, token="x")
                    asyncio.run(run())
        connect.assert_called_once_with("student-1", ws)

    def test_ws_endpoint_rejects_invalid_token(self):
        from unittest.mock import AsyncMock
        from app.api.v1.endpoints import ws as ws_module
        ws = MagicMock()
        ws.close = AsyncMock()
        with patch.object(ws_module, "decode_access_token", return_value=None):
            import asyncio
            async def run():
                await ws_module.ws_notifications(ws, token="bad")
            asyncio.run(run())
        ws.close.assert_called_once_with(code=4001)
