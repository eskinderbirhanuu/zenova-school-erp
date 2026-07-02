"""add school_id to remaining models

Revision ID: a7b9c1d2e3f4a5b6
Revises: cf5da0e968b4
Create Date: 2026-06-29 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7b9c1d2e3f4a5b6'
down_revision = 'cf5da0e968b4'
branch_labels = None
depends_on = None


TABLES = {
    "audit_logs": "school_id",
    "employee_contracts": "school_id",
    "exam_types": "school_id",
    "exams": "school_id",
    "exam_results": "school_id",
    "notification_preferences": "school_id",
    "parent_student_links": "school_id",
    "performance_reviews": "school_id",
    "promotion_records": "school_id",
    "report_cards": "school_id",
    "roles": "school_id",
    "scholarships": "school_id",
    "sections": "school_id",
    "staff_profiles": "school_id",
    "subjects": "school_id",
    "teacher_grade_assignments": "school_id",
    "teacher_profiles": "school_id",
    "teacher_section_assignments": "school_id",
    "timetable_entries": "school_id",
    "wallets": "school_id",
    "wallet_transactions": "school_id",
}


def upgrade() -> None:
    for table, column in TABLES.items():
        op.add_column(
            table,
            sa.Column(column, sa.String(36), sa.ForeignKey("schools.id"), nullable=True, index=True),
        )


def downgrade() -> None:
    for table, column in reversed(list(TABLES.items())):
        op.drop_column(table, column)
