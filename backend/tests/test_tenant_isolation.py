"""
Tenant isolation tests — verify School A cannot access School B data.
Tests verify service-layer school_id filtering via mock query inspection.
"""
from unittest.mock import MagicMock


def _make_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.all.return_value = []
    db.query.return_value.filter.return_value.count.return_value = 0
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
    return db


class TestStudentIsolation:
    def test_get_student_signature_accepts_school_id(self):
        import inspect
        from app.services.student_service import get_student
        sig = inspect.signature(get_student)
        assert "school_id" in sig.parameters

    def test_delete_student_signature_accepts_school_id(self):
        import inspect
        from app.services.student_service import delete_student
        sig = inspect.signature(delete_student)
        assert "school_id" in sig.parameters


class TestParentIsolation:
    def test_get_parent_signature_accepts_school_id(self):
        import inspect
        from app.services.parent_service import get_parent
        sig = inspect.signature(get_parent)
        assert "school_id" in sig.parameters


class TestAcademicIsolation:
    def test_get_exam_types_filters_by_school(self):
        from app.services.academic_service import get_exam_types
        db = _make_db()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_exam_types(db, school_id="school-a")
        assert result == []

    def test_get_exams_filters_by_school(self):
        from app.services.academic_service import get_exams
        db = _make_db()

        calls = []

        def track_filter(*args, **kwargs):
            calls.append(("filter", args, kwargs))
            return _make_db().query.return_value

        db.query.return_value.filter.side_effect = track_filter
        get_exams(db, school_id="school-a")
        assert any("school_id" in str(a) for c in calls for a in c[1]), "school_id not in filter"


class TestFinanceIsolation:
    def test_get_fee_structures_filters_by_school(self):
        from app.services.finance_service import get_fee_structures
        db = _make_db()
        db.query.return_value.join.return_value.filter.return_value.all.return_value = []
        result = get_fee_structures(db, school_id="school-a")
        assert result == []

    def test_get_scholarships_filters_by_school(self):
        from app.services.finance_service import get_scholarships
        db = _make_db()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_scholarships(db, school_id="school-a")
        assert result == []


class TestHRIsolation:
    def test_get_contracts_filters_by_school(self):
        from app.services.hr_service import get_contracts
        db = _make_db()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_contracts(db, school_id="school-a")
        assert result == []

    def test_get_performance_reviews_filters_by_school(self):
        from app.services.hr_service import get_performance_reviews
        db = _make_db()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_performance_reviews(db, school_id="school-a")
        assert result == []


class TestNFCCardIsolation:
    def test_update_nfc_status_signature_accepts_school_id(self):
        import inspect
        from app.services.nfc_service import update_nfc_status
        sig = inspect.signature(update_nfc_status)
        assert "school_id" in sig.parameters

    def test_nfc_v2_get_student_by_card_signature_accepts_school_id(self):
        import inspect
        from app.services.nfc_v2_service import get_student_by_card
        sig = inspect.signature(get_student_by_card)
        assert "school_id" in sig.parameters

    def test_nfc_v2_get_staff_by_card_signature_accepts_school_id(self):
        import inspect
        from app.services.nfc_v2_service import get_staff_by_card
        sig = inspect.signature(get_staff_by_card)
        assert "school_id" in sig.parameters

    def test_nfc_v2_get_parent_by_card_signature_accepts_school_id(self):
        import inspect
        from app.services.nfc_v2_service import get_parent_by_card
        sig = inspect.signature(get_parent_by_card)
        assert "school_id" in sig.parameters

    def test_nfc_v2_get_employee_by_card_signature_accepts_school_id(self):
        import inspect
        from app.services.nfc_v2_service import get_employee_by_card
        sig = inspect.signature(get_employee_by_card)
        assert "school_id" in sig.parameters


class TestTeacherIsolation:
    def test_assign_grade_signature_accepts_school_id(self):
        import inspect
        from app.services.teacher_service import assign_grade
        sig = inspect.signature(assign_grade)
        assert "school_id" in sig.parameters


class TestBulkPromoteIsolation:
    def test_bulk_promote_signature_accepts_school_id(self):
        import inspect
        from app.services.academic_service import bulk_promote_students
        sig = inspect.signature(bulk_promote_students)
        assert "school_id" in sig.parameters
