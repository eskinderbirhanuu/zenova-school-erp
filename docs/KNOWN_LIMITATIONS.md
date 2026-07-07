# Known Limitations — ZENOVA School ERP

**Date:** 2026-07-07
**Analyst:** Lead Software Architect (AI-Agent)

---

## Limitation 1: Corporate Models Lack Tenant Isolation

### Description
`CorporateDepartment` and `CorporateEmployee` do not have a `school_id` column. The current fix gates access by role (`CORPORATE_EMPLOYEE_VIEW`, etc.), but the underlying data remains globally queryable within the database.

### Why It Cannot Be Solved Now
Adding `school_id` to these tables requires an Alembic migration, data backfill for existing rows, and a review of all corporate service logic to ensure `school_id` is populated on create. This is a larger schema refactor that is deferred to a future cycle.

### Recommended Future Solution
Add `school_id` to both models, migrate existing data to a designated "global" or "corporate" school, and enforce `school_id` filters in `corporate_service`.

---

## Limitation 2: Settings PUT Still Accepts Arbitrary JSON (After Permission Fix)

### Description
`/settings PUT` currently accepts `data: dict` and stores it as a JSON blob. While the permission overflow is fixed (only `SETTINGS_MANAGE` can call it), the endpoint still accepts any JSON shape. There is no schema validation for the contents.

### Why It Cannot Be Solved Now
The `SchoolSettings` model uses a generic `settings_json` text column. Defining a strict Pydantic schema would require agreeing on all valid settings keys across all modules, which is a product-level decision beyond this security fix scope.

### Recommended Future Solution
Create a `SchoolSettingsUpdate` Pydantic schema with `TypedDict` or a structured model that validates allowed keys (e.g., `payment_gateway_id`, `branding_logo_url`, `academic_year_id`, etc.).

---

## Limitation 3: IGA Endpoints Use AUDIT_VIEW as a Proxy Permission

### Description
The fix for `/iga/metrics` and `/iga/health-summary` reuses `AUDIT_VIEW` because no dedicated infrastructure or IGA permission exists. This is semantically imprecise.

### Why It Cannot Be Solved Now
Adding a new permission enum value (`IGA_VIEW` or `INFRASTRUCTURE_VIEW`) requires updating the database role-permission mapping, the `Permission` class, and potentially the frontend permission matrix. This is a medium-sized change deferred to a future RBAC refinement cycle.

### Recommended Future Solution
Introduce `Permission.INFRASTRUCTURE_VIEW` and map it to `ADMIN`, `SUPER_ADMIN`, and a new `INFRASTRUCTURE_ADMIN` role.

---

## Limitation 4: NFC Card UID Enumeration Remains Possible

### Description
`/nfc/public/lookup` is an unauthenticated endpoint that returns whether a `card_uid` exists. This allows an attacker to enumerate valid card UIDs. The fix for the by-card endpoints prevents cross-tenant PII leaks, but the public lookup endpoint itself is still unprotected.

### Why It Cannot Be Solved Now
The public lookup is documented as a feature for third-party readers to verify ZENOVA card ownership. Removing it or adding authentication would break legitimate hardware integrations.

### Recommended Future Solution
Add a rate limit and a CAPTCHA or HMAC token requirement for the public lookup endpoint, or gate it behind an API key.

---

## Limitation 5: Parent Payments Amount Is Still Float in Endpoint Signature

### Description
`/parent-payments/create-session` and other payment endpoints accept `amount: float` in the query/path params, even though the database uses `DECIMAL(15,2)`. This can cause precision issues.

### Why It** It Cannot Be Solved Now
The audit prioritized cross-tenant IDOR and permission issues over the float-vs-Decimal contract breach. Updating these endpoints to use `Decimal` in the FastAPI signature requires updating the Pydantic schemas and potentially the frontend integration.

### Recommended Future Solution
Define a `Money` type alias (`Decimal = Field(..., decimal_places=2, ge=0)`) and apply it across all finance, cafeteria, and inventory schemas.
