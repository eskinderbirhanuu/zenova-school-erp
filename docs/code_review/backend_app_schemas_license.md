# File Reviewed

`backend/app/schemas/license.py` (366 lines)

## Schemas

License/school/branch/activation flow (v1 and v2): `LicenseVerifyRequest/Response`, `LicenseActivateRequest/Response`, `LicenseCreateRequest`, `LicenseStatusUpdate` (with regex pattern), `LicenseResponse`, `LicenseListResponse`.
Setup flow: `SchoolCreateRequest`, `SchoolResponse`, `SchoolBrandingResponse`, `BranchCreateRequest`, `BranchUpdateRequest`, `BranchResponse`, `SetupAdminRequest/Response`, `SetupStatusResponse`, `LicenseStatusResponse`, `SetupValidateRequest/Response`, `SetupInitializeRequest/Response`.
Activation v2: `ActivateValidateRequest/Response`, `ActivateInitializeRequest/Response`, `BranchWithLicenseRequest`.
Plus: `ValidateLicenseTypeRequest/Response`, `InitializeMainRequest/Response`, `InitializeBranchRequest/Response`, `CreateEmployeeRequest/Response` (with `role_name` pattern validation).
Recovery: `VerifyContactRequest/Response`, `ResetPasswordRequest/Response`, `IssueRecoveryCodeRequest/Response`.
Device Change: `DeviceChangeRequestResponse`, `DeviceChangeListResponse`, `DeviceChangeReviewRequest`, `DeviceChangeHistoryResponse`.

## Issues

### Issue 1 — Large, Comprehensive File

- **Lines:** 1-366
- **Severity:** Good
- **Category:** Architecture
- **Description:** Covers full licensing lifecycle, multi-school setup, employee creation with role validation, password recovery with recovery codes, and device change management.

### Issue 2 — Good Regex Validation on `LicenseStatusUpdate` and `CreateEmployeeRequest`

- **Lines:** 34, 284
- **Severity:** Good
- **Category:** Security
- **Description:** Uses `Field(pattern="...")` for constrained string values.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
