"""add_nfc_v2_tables_and_corporate

Revision ID: 960fd8c2c236
Revises: 592860dea46f
Create Date: 2026-07-05 16:05:12.825331

"""
from alembic import op
import sqlalchemy as sa


revision = '960fd8c2c236'
down_revision = '592860dea46f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # corporate_departments without head_employee_id FK (circular dependency)
    op.create_table('corporate_departments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('head_employee_id', sa.String(length=36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name'),
    )
    op.create_table('corporate_employees',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('employee_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('full_name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('department_id', sa.String(length=36), nullable=True),
        sa.Column('position', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('employment_date', sa.Date(), nullable=True),
        sa.Column('employment_type', sa.String(length=20), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['department_id'], ['corporate_departments.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_corporate_employees_employee_id'), 'corporate_employees', ['employee_id'], unique=True)
    # Add the circular FK now that both tables exist
    op.create_foreign_key('fk_corporate_departments_head_employee', 'corporate_departments',
                          'corporate_employees', ['head_employee_id'], ['id'])
    op.create_table('card_print_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('card_type', sa.String(length=20), nullable=False),
        sa.Column('reference_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('requested_by', sa.String(length=36), nullable=True),
        sa.Column('approved_by', sa.String(length=36), nullable=True),
        sa.Column('printed_by', sa.String(length=36), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['printed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table('employee_cards',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('employee_id', sa.String(length=36), nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['corporate_employees.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_employee_cards_card_uid'), 'employee_cards', ['card_uid'], unique=True)
    op.create_index(op.f('ix_employee_cards_employee_id'), 'employee_cards', ['employee_id'], unique=False)
    op.create_table('nfc_scan_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('reference_type', sa.String(length=20), nullable=False),
        sa.Column('reference_id', sa.String(length=36), nullable=False),
        sa.Column('scan_type', sa.String(length=20), nullable=False),
        sa.Column('scanned_at', sa.DateTime(), nullable=True),
        sa.Column('reader_location', sa.String(length=100), nullable=True),
        sa.Column('school_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_nfc_scan_logs_card_uid'), 'nfc_scan_logs', ['card_uid'], unique=False)
    op.create_table('parent_cards',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['parents.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_parent_cards_card_uid'), 'parent_cards', ['card_uid'], unique=True)
    op.create_index(op.f('ix_parent_cards_parent_id'), 'parent_cards', ['parent_id'], unique=False)
    op.create_table('staff_cards',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('staff_profile_id', sa.String(length=36), nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['staff_profile_id'], ['staff_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_staff_cards_card_uid'), 'staff_cards', ['card_uid'], unique=True)
    op.create_index(op.f('ix_staff_cards_staff_profile_id'), 'staff_cards', ['staff_profile_id'], unique=False)
    op.create_table('student_cards',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('student_id', sa.String(length=36), nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('issue_date', sa.DateTime(), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_student_cards_card_uid'), 'student_cards', ['card_uid'], unique=True)
    op.create_index(op.f('ix_student_cards_student_id'), 'student_cards', ['student_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_student_cards_student_id'), table_name='student_cards')
    op.drop_index(op.f('ix_student_cards_card_uid'), table_name='student_cards')
    op.drop_table('student_cards')
    op.drop_index(op.f('ix_staff_cards_staff_profile_id'), table_name='staff_cards')
    op.drop_index(op.f('ix_staff_cards_card_uid'), table_name='staff_cards')
    op.drop_table('staff_cards')
    op.drop_index(op.f('ix_parent_cards_parent_id'), table_name='parent_cards')
    op.drop_index(op.f('ix_parent_cards_card_uid'), table_name='parent_cards')
    op.drop_table('parent_cards')
    op.drop_index(op.f('ix_nfc_scan_logs_card_uid'), table_name='nfc_scan_logs')
    op.drop_table('nfc_scan_logs')
    op.drop_index(op.f('ix_employee_cards_employee_id'), table_name='employee_cards')
    op.drop_index(op.f('ix_employee_cards_card_uid'), table_name='employee_cards')
    op.drop_table('employee_cards')
    op.drop_table('card_print_requests')
    op.drop_index(op.f('ix_corporate_employees_employee_id'), table_name='corporate_employees')
    op.drop_table('corporate_employees')
    op.drop_constraint('fk_corporate_departments_head_employee', 'corporate_departments', type_='foreignkey')
    op.drop_table('corporate_departments')
