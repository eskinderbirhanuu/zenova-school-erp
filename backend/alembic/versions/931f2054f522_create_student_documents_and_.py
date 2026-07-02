"""create student_documents and school_announcements tables

Revision ID: 931f2054f522
Revises: fd71dab89712
Create Date: 2026-07-01 16:57:26.430425

"""
from alembic import op
import sqlalchemy as sa

revision = "931f2054f522"
down_revision = "fd71dab89712"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "school_announcements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("target_roles", sa.String(500), nullable=True),
        sa.Column("is_published", sa.Boolean(), server_default="true"),
        sa.Column("school_id", sa.String(36), sa.ForeignKey("schools.id"), nullable=False, index=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("school_announcements")
    op.drop_table("student_documents")
