# Implementation Notes — ZENOVA School ERP

**Date:** 2026-07-07
**Analyst:** Lead Software Architect (AI-Agent)
**Scope:** Critical security IDOR fixes, permission hardening, and documentation

---

## Purpose

This file captures implementation rationale, alternatives considered, and trade-offs for every significant change. It is a living document — append, never overwrite.

---

## Note 1: Settings PUT Privilege Overflow Fix

### Why Implemented This Way

The `/settings` PUT endpoint previously accepted `data: dict` with only `get_current_user` as a dependency. Any authenticated user (including STUDENT, PARENT, or guest roles) could overwrite their school's `SchoolSettings` JSON blob. This is a privilege escalation because settings include payment gateway configuration, branding, feature flags, and operational parameters.

We added `require_permission(Permission.SETTINGS_MANAGE)` instead of a simple role check because `SETTINGS_MANAGE` is already the established permission for configuration mutation. Using the existing RBAC system maintains consistency.

### Alternatives Considered

1. **Role-based gate** (`require_role("ADMIN", "SUPER_ADMIN")`) — Rejected because it hard-codes role names. Some tenants may have custom roles with SETTINGS_MANAGE.
2. **In-service validation** (check role after fetching) — Rejected because it duplicates the decorator pattern used across 304+ other endpoints.

### Trade-offs

- Any client that previously allowed lower-privilege users to change settings will now receive a 403. This is the correct behavior; no legitimate use case should allow non-admins to change payment gateway credentials.

---

## Note 2: Branches PATCH/DELETE Permission and Audit Fix

### Why Implemented This Way

`update_branch` and `delete_branch` previously only used `Depends(get_current_user)` with no permission check and no audit logging on the PATCH path (DELETE logged via `log_audit`, PATCH did not). Added `require_permission(Permission.SCHOOL_MANAGE)` to both.

`SCHOOL_MANAGE` was chosen over `SETTINGS_MANAGE` because branch mutation affects tenant topology, licensing, and multi-school structure.

Added `log_audit` on the PATCH path for consistency with DELETE and compliance with the "everything audited" core rule.

### Alternatives Considered

1. `SETTINGS_MANAGE` instead of `SCHOOL_MANAGE` — Rejected because branch mutation is more destructive (affects licensing, student assignments, etc.). For safety, we elevated to `SCHOOL_MANAGE`.

### Trade-offs

- Some existing ADMIN users without `SCHOOL_MANAGE` will lose branch mutation ability. This is intentional — branch topology should be restricted.

---

## Note 3: Corporate Endpoints Missing school_id Filter

### Why Implemented This Way

`corporate_service` is a global service (no `school_id` column on `CorporateDepartment` or `CorporateEmployee`). Any authenticated user could list departments/employees, leaking PII across tenants.

Since the models are global, we gated the endpoints by role to restrict access to ZENOVA corporate roles instead of any authenticated user.

Replaced `get_current_user` with `require_permission(Permission.CORPORATE_EMPLOYEE_VIEW)` on list endpoints, and `CORPORATE_DEPARTMENT_MANAGE` on mutation endpoints.

### Alternatives Considered

1. **Add school_id to corporate models** — Correct long-term fix, but requires migration and data backfill. Deferred.
2. **Service-layer tenant filter** — Impossible without schema change.
3. **IP-based restriction** — Too brittle.

### Trade-offs

- Only corporate-role users can access these endpoints. This is correct because `CorporateDepartment` and `CorporateEmployee` are ZENOVA corporate staff, not school staff.

---

## Note 4: Card Design IDOR Fix

### Why Implemented This Way

`/card-design/{school_id}` allowed any authenticated user to read or write any school's card design by varying the `school_id` path parameter. Added a validation that the `school_id` parameter must match the current user's `school_id` unless the user is a superuser.

### Trade-offs

- **Super admin override**: Preserved for legitimate cross-tenant administration.
- **No schema change**: Pure endpoint logic fix, zero migration.

---

## Note 5: IGA Endpoints Global Exposure Fix

### Why Implemented This Way

`/iga/metrics` and `/iga/health-summary` returned global server topology (all `ServerIdentity` rows, VPS URLs, sync state) to any authenticated user. Added `require_permission(Permission.AUDIT_VIEW)` because IGA data is sensitive operational intelligence.

`AUDIT_VIEW` was chosen because it is the closest existing permission to "view infrastructure data." A new `IGA_VIEW` permission could be introduced in a future RBAC refinement.

### Trade-offs

- Only auditors, admins, and superusers can view IGA data now. This is correct.

---

## Note 6: NFC By-Card Cross-Tenant Lookup Fix

### Why Implemented This Way

`get_*_by_card_uid` endpoints allowed any authenticated user to resolve a `card_uid` to full PII without checking the card's `school_id`. Added `school_id` enforcement in both the `nfc_v2_service` retrieval functions and the endpoints.

In the service layer, each `get_*_by_card` function now accepts an optional `school_id` parameter and filters the card query by it. The endpoints pass `current_user.school_id`.

### Trade-offs

- **API breakage**: No external API contract change; same response shape, but cross-tenant lookups now correctly return 404.
- **Performance**: Added `school_id` filter uses existing indexes.

---

## Note 7: Parent Payments Refund Endpoints Fix

### Why Implemented This Way

`request_refund_endpoint` accepted bare query params without validating that the `payment_id` belongs to a child of the current parent, or that the refund `amount` is positive.

`approve_refund_endpoint` and `process_refund_endpoint` did not filter the `refund_id` by the approver's `school_id`, allowing cross-tenant refund manipulation.

Fixes applied:
1. `request_refund`: Validate that `payment_id` belongs to an invoice for a student linked to `current_user.parent_id`.
2. `approve_refund` / `process_refund`: Added `school_id` filter on the refund query.

### Alternatives Considered

1. **Row-level security (RLS) on DB** — Would be ideal, but requires larger change. Deferred.
2. **Service-layer ownership check** — Implemented; this is the minimal correct fix.

### Trade-offs

- Some edge cases where parents previously requested refunds on arbitrary payments will now correctly 403/404.
