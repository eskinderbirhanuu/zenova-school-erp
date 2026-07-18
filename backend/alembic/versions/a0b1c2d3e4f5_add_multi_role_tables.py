"""add_multi_role_tables

Creates user_roles and role_permissions tables, migrates existing
single-role assignments, and seeds permission definitions.

Revision ID: a0b1c2d3e4f5
Revises: fe06878765f8
Create Date: 2026-07-17 04:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'a0b1c2d3e4f5'
down_revision = 'fe06878765f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── user_roles ──────────────────────────────────────────────
    op.create_table('user_roles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_by', sa.String(length=36), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )
    op.create_index('ix_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('ix_user_roles_role_id', 'user_roles', ['role_id'])

    # ── role_permissions ─────────────────────────────────────────
    op.create_table('role_permissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('permission_key', sa.String(length=100), nullable=False),
        sa.Column('is_granted', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_key', name='uq_role_permission'),
    )
    op.create_index('ix_role_permissions_role_id', 'role_permissions', ['role_id'])
    op.create_index('ix_role_permissions_permission_key', 'role_permissions', ['permission_key'])

    # ── Migrate existing single-role assignments ─────────────────
    conn = op.get_bind()

    # For every user with a role_id, create a user_roles entry
    users = conn.execute(
        sa.text("SELECT id, role_id FROM users WHERE role_id IS NOT NULL AND deleted_at IS NULL")
    ).fetchall()

    for user_id, role_id in users:
        existing = conn.execute(
            sa.text("SELECT id FROM user_roles WHERE user_id = :uid AND role_id = :rid AND deleted_at IS NULL"),
            {"uid": user_id, "rid": role_id},
        ).fetchone()
        if not existing:
            import uuid
            conn.execute(
                sa.text("""
                    INSERT INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, created_at)
                    VALUES (:id, :uid, :rid, :by, :now, :now)
                """),
                {"id": str(uuid.uuid4()), "uid": user_id, "rid": role_id, "by": user_id, "now": sa.func.now()},
            )

    # ── Seed role_permissions from ROLE_PERMISSIONS dict ─────────
    from app.core.permissions import ROLE_PERMISSIONS

    for role_name, perms in ROLE_PERMISSIONS.items():
        role = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = :name AND deleted_at IS NULL"),
            {"name": role_name},
        ).fetchone()
        if not role:
            continue
        role_id = role[0]
        for perm_key in perms:
            existing = conn.execute(
                sa.text("SELECT id FROM role_permissions WHERE role_id = :rid AND permission_key = :pk AND deleted_at IS NULL"),
                {"rid": role_id, "pk": perm_key},
            ).fetchone()
            if not existing:
                import uuid
                conn.execute(
                    sa.text("""
                        INSERT INTO role_permissions (id, role_id, permission_key, is_granted, created_at)
                        VALUES (:id, :rid, :pk, :granted, :now)
                    """),
                    {"id": str(uuid.uuid4()), "rid": role_id, "pk": perm_key, "granted": True, "now": sa.func.now()},
                )


def downgrade() -> None:
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
