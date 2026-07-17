"""add_indexes_unique_constraints_column_types

Revision ID: f7e8d9c0a1b2
Revises: e1f2a3b4c5d6
Create Date: 2026-07-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f7e8d9c0a1b2"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = "6d478aefeea0"


def upgrade():
    # ----------------------------------------------------------------
    # INDEXES on unindexed foreign keys
    # ----------------------------------------------------------------

    # payments
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])
    op.create_index("ix_payments_student_id", "payments", ["student_id"])
    op.create_index("ix_payments_parent_id", "payments", ["parent_id"])
    op.create_index("ix_payments_school_id", "payments", ["school_id"])
    op.create_index("ix_payments_received_by", "payments", ["received_by"])
    op.create_index("ix_payments_journal_entry_id", "payments", ["journal_entry_id"])

    # students
    op.create_index("ix_students_grade_id", "students", ["grade_id"])
    op.create_index("ix_students_section_id", "students", ["section_id"])
    op.create_index("ix_students_academic_year_id", "students", ["academic_year_id"])
    op.create_index("ix_students_school_id", "students", ["school_id"])
    op.create_index("ix_students_branch_id", "students", ["branch_id"])
    op.create_index("ix_students_registered_by", "students", ["registered_by"])
    op.create_index("ix_students_user_id", "students", ["user_id"])

    # users
    op.create_index("ix_users_role_id", "users", ["role_id"])
    op.create_index("ix_users_school_id", "users", ["school_id"])
    op.create_index("ix_users_branch_id", "users", ["branch_id"])

    # licenses
    op.create_index("ix_licenses_school_id", "licenses", ["school_id"])
    op.create_index("ix_licenses_branch_id", "licenses", ["branch_id"])
    op.create_index("ix_licenses_school_id_status", "licenses", ["school_id", "status"])

    # attendance
    op.create_index("ix_attendance_staff_profile_id", "attendance", ["staff_profile_id"])
    op.create_index("ix_attendance_student_id", "attendance", ["student_id"])
    op.create_index("ix_attendance_school_id", "attendance", ["school_id"])
    op.create_index("ix_attendance_marked_by", "attendance", ["marked_by"])

    # password_reset_requests
    op.create_index("ix_password_reset_requests_initiated_by", "password_reset_requests", ["initiated_by"])
    op.create_index("ix_password_reset_requests_approved_by", "password_reset_requests", ["approved_by"])

    # password_audit
    op.create_index("ix_password_audit_initiated_by_user_id", "password_audit", ["initiated_by_user_id"])
    op.create_index("ix_password_audit_approved_by_user_id", "password_audit", ["approved_by_user_id"])

    # ----------------------------------------------------------------
    # UNIQUE CONSTRAINTS
    # ----------------------------------------------------------------
    op.create_unique_constraint("uq_payments_school_payment_number", "payments", ["school_id", "payment_number"])
    op.create_unique_constraint("uq_attendance_student_date", "attendance", ["student_id", "date"])
    op.create_unique_constraint("uq_role_school_name", "roles", ["school_id", "name"])

    # ----------------------------------------------------------------
    # COLUMN TYPE CHANGES
    # ----------------------------------------------------------------
    # licenses.max_users: String(50) -> Integer
    # Use USING to cast safely; non-numeric values and empty strings become NULL
    op.execute(
        "ALTER TABLE licenses ALTER COLUMN max_users TYPE integer "
        "USING (CASE WHEN trim(max_users) ~ '^[0-9]+$' THEN trim(max_users)::integer ELSE NULL END)"
    )

    # password_audit.metadata_json: Text -> JSON
    op.execute(
        "ALTER TABLE password_audit ALTER COLUMN metadata_json TYPE json "
        "USING (CASE WHEN metadata_json IS NULL THEN NULL ELSE metadata_json::json END)"
    )


def downgrade():
    # ----------------------------------------------------------------
    # COLUMN TYPE CHANGES (reverse)
    # ----------------------------------------------------------------
    op.execute("ALTER TABLE password_audit ALTER COLUMN metadata_json TYPE text USING metadata_json::text")
    op.execute("ALTER TABLE licenses ALTER COLUMN max_users TYPE varchar(50) USING max_users::varchar(50)")

    # ----------------------------------------------------------------
    # UNIQUE CONSTRAINTS (reverse)
    # ----------------------------------------------------------------
    op.drop_constraint("uq_role_school_name", "roles", type_="unique")
    op.drop_constraint("uq_attendance_student_date", "attendance", type_="unique")
    op.drop_constraint("uq_payments_school_payment_number", "payments", type_="unique")

    # ----------------------------------------------------------------
    # INDEXES (reverse)
    # ----------------------------------------------------------------
    op.drop_index("ix_password_audit_approved_by_user_id", table_name="password_audit")
    op.drop_index("ix_password_audit_initiated_by_user_id", table_name="password_audit")
    op.drop_index("ix_password_reset_requests_approved_by", table_name="password_reset_requests")
    op.drop_index("ix_password_reset_requests_initiated_by", table_name="password_reset_requests")
    op.drop_index("ix_attendance_marked_by", table_name="attendance")
    op.drop_index("ix_attendance_school_id", table_name="attendance")
    op.drop_index("ix_attendance_student_id", table_name="attendance")
    op.drop_index("ix_attendance_staff_profile_id", table_name="attendance")
    op.drop_index("ix_licenses_school_id_status", table_name="licenses")
    op.drop_index("ix_licenses_branch_id", table_name="licenses")
    op.drop_index("ix_licenses_school_id", table_name="licenses")
    op.drop_index("ix_users_branch_id", table_name="users")
    op.drop_index("ix_users_school_id", table_name="users")
    op.drop_index("ix_users_role_id", table_name="users")
    op.drop_index("ix_students_user_id", table_name="students")
    op.drop_index("ix_students_registered_by", table_name="students")
    op.drop_index("ix_students_branch_id", table_name="students")
    op.drop_index("ix_students_school_id", table_name="students")
    op.drop_index("ix_students_academic_year_id", table_name="students")
    op.drop_index("ix_students_section_id", table_name="students")
    op.drop_index("ix_students_grade_id", table_name="students")
    op.drop_index("ix_payments_journal_entry_id", table_name="payments")
    op.drop_index("ix_payments_received_by", table_name="payments")
    op.drop_index("ix_payments_school_id", table_name="payments")
    op.drop_index("ix_payments_parent_id", table_name="payments")
    op.drop_index("ix_payments_student_id", table_name="payments")
    op.drop_index("ix_payments_invoice_id", table_name="payments")
