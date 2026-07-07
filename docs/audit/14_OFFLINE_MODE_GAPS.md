# Offline Mode Gaps Audit

## Summary
ZENOVA has a sync system for offline/online hybrid deployment, but it is not a true offline-first architecture. The sync is queue-based and requires periodic connectivity.

## Existing Features
- Sync queue for pending operations
- Sync inbound tracking for deduplication
- Background sync worker thread
- Conflict detection and logging
- Server identity management (MAIN_SCHOOL, BRANCH, VPS)
- HMAC-signed sync payloads

## Missing Features
- **True offline-first**: App cannot function without initial connectivity
- **Local database**: No SQLite/IndexedDB for local storage
- **Offline UI**: No offline indicator or degraded mode UI
- **Conflict resolution UI**: No user-facing conflict resolution
- **Sync status visibility**: No sync progress/status indicators
- **Selective sync**: No per-module sync configuration
- **Sync scheduling**: No configurable sync intervals
- **Offline forms**: Forms cannot be filled offline
- **Background sync**: No Service Worker for background sync
- **Data integrity checks**: No checksum validation for synced data

## Risks
| Risk | Severity | Description |
|------|----------|-------------|
| Not true offline-first | High | Requires connectivity for core functions |
| No local database | High | Data not available offline |
| No conflict resolution UI | Medium | Users cannot resolve sync conflicts |
| No offline forms | Medium | Data entry requires connectivity |

## Recommendations
1. Implement local SQLite/IndexedDB storage
2. Add Service Worker for background sync
3. Build offline indicator and degraded mode UI
4. Create conflict resolution interface
5. Enable offline form submission with queue

## Estimated Development Effort
- **High**: 6-8 weeks for true offline-first architecture
- **Medium**: 2-3 weeks for conflict resolution + sync UI
- **Low**: 1 week for offline indicators
