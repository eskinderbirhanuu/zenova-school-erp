# Database Changes

## Migration: a7b9c1d2e3f4a5b6_add_school_id_remaining

**Date:** 2026-06-29
**Previous migration:** cf5da0e968b4

### Change

Added `school_id` column to 21 tables:

| Table | Column | Nullable | Index |
|-------|--------|----------|-------|
| audit_logs | school_id | YES | YES |
| employee_contracts | school_id | YES | YES |
| exam_types | school_id | YES | YES |
| exams | school_id | YES | YES |
| exam_results | school_id | YES | YES |
| notification_preferences | school_id | YES | YES |
| parent_student_links | school_id | YES | YES |
| performance_reviews | school_id | YES | YES |
| promotion_records | school_id | YES | YES |
| report_cards | school_id | YES | YES |
| roles | school_id | YES | YES |
| scholarships | school_id | YES | YES |
| sections | school_id | YES | YES |
| staff_profiles | school_id | YES | YES |
| subjects | school_id | YES | YES |
| teacher_grade_assignments | school_id | YES | YES |
| teacher_profiles | school_id | YES | YES |
| teacher_section_assignments | school_id | YES | YES |
| timetable_entries | school_id | YES | YES |
| wallets | school_id | YES | YES |
| wallet_transactions | school_id | YES | YES |

**Foreign key:** `schools.id`

### Why

Without `school_id` columns, queries cannot filter by school even when endpoints pass the parameter. This was the root cause of cross-school data leaks.

### Migration

```bash
cd backend
alembic upgrade head
```

### Rollback

```bash
cd backend
alembic downgrade a7b9c1d2e3f4a5b6
```

### Data Migration

For existing production data, `school_id` will be NULL after migration. Run a one-time script to backfill:

```python
# One-time backfill script
def backfill_school_ids(db: Session):
    # For tables with indirect school_id via FK relationships
    backfill_exam_school_ids(db)
    backfill_exam_result_school_ids(db)
    # ... etc
```

### Schema Documentation Updates

All 21 models now include `school_id` column. See model files for column definitions.
