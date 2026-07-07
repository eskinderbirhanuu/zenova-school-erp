# API Gaps Audit

## Summary
The REST API is comprehensive with 40+ endpoint modules. However, inconsistencies exist in pagination, error responses, and documentation. GraphQL is not supported.

## Existing Features
- 40+ endpoint modules covering all ERP domains
- JWT authentication with cookie + header support
- Rate limiting per endpoint category
- CSRF protection for state-changing operations
- Pydantic request/response schemas
- Automatic OpenAPI docs (disabled in production)
- WebSocket endpoint for real-time updates
- File upload endpoints
- Excel import/export endpoints

## Missing Features
- **GraphQL endpoint**: No flexible query interface
- **API versioning strategy**: v1 hardcoded; no deprecation headers
- **Consistent pagination**: Some endpoints lack pagination
- **HATEOAS**: No hypermedia links in responses
- **Request/response examples**: No example data in OpenAPI
- **API rate limiting per user**: Only per-IP rate limiting
- **Bulk operations**: Limited bulk endpoints
- **Webhook support**: No webhook registration/management
- **API key authentication**: Only JWT supported
- **Request ID propagation**: No distributed tracing headers

## Risks
| Risk | Severity | Description |
|------|----------|-------------|
| Inconsistent pagination | Medium | Some endpoints return unbounded results |
| No API versioning | Medium | Breaking changes require client updates |
| No bulk operations | Medium | Batch tasks require multiple API calls |
| No webhooks | Low | Integrations must poll instead of receiving events |
| No GraphQL | Low | Clients over/under-fetch data |

## Recommendations
1. Standardize pagination across all list endpoints (cursor-based for large tables)
2. Add API versioning headers (X-API-Version)
3. Implement bulk create/update/delete endpoints
4. Add webhook registration and event delivery system
5. Consider GraphQL for complex data fetching

## Estimated Development Effort
- **High**: 2-3 weeks for GraphQL or bulk operations
- **Medium**: 1 week for pagination standardization
- **Low**: 3 days for webhook system
