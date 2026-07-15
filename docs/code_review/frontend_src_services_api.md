# File Reviewed

`frontend/src/services/api.ts` (408 lines)

## Api Client

- Axios instance with CSRF token injection, 401 auto-refresh, 429 rate-limit logging.
- Service objects: `authService`, `studentService`, `parentService`, `teacherService`, `staffService`, `academicService`, `financeService`, `hrService`, `inventoryService`, `qrService`, `nfcService`, `nfcV2Service`, `cardDesignService`, `corporateService`, `licenseService`, `libraryService`, `cafeteriaService`, `deviceReviewService`, `auditService`, `setupWizardService`, `setupService`, `branchService`, `schoolService`, `telegramService`, `notificationService`, `dashboardService`, `studentPortalService`, `platformService`, `announcementService`.

## Issues

### Issue 1 — Well-Structured Service Layer

- **Lines:** 50-408
- **Severity:** Good
- **Category:** Architecture
- **Description:** Comprehensive organization of all API endpoints into typed service objects. Consistent CRUD patterns.

### Issue 2 — Good CSRF and Token Refresh Interceptors

- **Lines:** 17-23, 25-48
- **Severity:** Good
- **Category:** Security
- **Description:** Auto-injects CSRF token from cookie, retries on 401 after refresh, handles expired sessions.

### Issue 3 — Many `any` Types

- **Lines:** 55, etc.
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Most `data` parameters typed as `any`. Could use proper type parameters.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
