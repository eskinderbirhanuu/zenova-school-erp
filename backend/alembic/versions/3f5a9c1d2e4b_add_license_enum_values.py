"""add_license_enum_values

Revision ID: 3f5a9c1d2e4b
Revises: 36bb7866750b
Create Date: 2026-08-09 10:30:00.000000

Adds enum members that the License model already declares but the
initial migration never created:
  - licensetype:     SUPER_ADMIN
  - licensestatus:   REVIEW_MODE, DEVICE_LOCKED
Without these, fresh installs cannot seed/activate a SUPER_ADMIN license
(the installer flow fails with "invalid input value for enum licensetype").
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3f5a9c1d2e4b'
down_revision = '36bb7866750b'
branch_labels = None
depends_on = None


def _enum_values(bind, name: str) -> list:
    rows = bind.exec_driver_sql(
        "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid "
        "WHERE t.typname = %s ORDER BY e.enumsortorder",
        (name,),
    ).fetchall()
    return [r[0] for r in rows]


def upgrade() -> None:
    bind = op.get_bind()
    if "SUPER_ADMIN" not in _enum_values(bind, "licensetype"):
        op.execute("ALTER TYPE licensetype ADD VALUE 'SUPER_ADMIN'")
    existing = _enum_values(bind, "licensestatus")
    for value in ("REVIEW_MODE", "DEVICE_LOCKED"):
        if value not in existing:
            op.execute("ALTER TYPE licensestatus ADD VALUE '%s'" % value)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values. The added members are
    # harmless if the column is later dropped/recreated, so this is a no-op.
    pass
