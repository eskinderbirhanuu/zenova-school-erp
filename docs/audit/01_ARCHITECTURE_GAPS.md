# Architecture Gaps Audit

## Summary
ZENOVA follows a modular monolithic architecture with FastAPI backend and Next.js frontend. The system supports multi-tenancy via `school_id` and has a hybrid local/cloud deployment model. However, several architectural gaps exist around offline-first capabilities, microservices readiness, and event-driven patterns.

## Existing Features
- Modular FastAPI backend with clear endpoint separation
- SQLAlchemy ORM with soft-delete pattern via `before_compile` query filter
- Redis for caching, rate limiting, and session management
- JWT-based authentication with refresh token rotation
- Role-based access control (RBAC) with 12 roles and 18 permissions
- Multi-tenant isolation via `school_id` across all models
- Docker Compose for local development
- Kubernetes manifests for production deployment
- WebSocket support for real-time features
- Background sync worker thread for queue processing

## Missing Features
- **Event-driven architecture**: No message broker (RabbitMQ/Kafka) for async processing
- **CQRS pattern**: Read and write models are not separated
- **API Gateway**: No centralized gateway for routing, throttling, or API versioning
- **Service mesh**: No Istio/Linkerd for inter-service communication
- **GraphQL support**: Only REST APIs exposed
- **BFF (Backend-for-Frontend) pattern**: Frontend directly calls backend APIs
- **Circuit breaker pattern**: No resilience patterns for external service calls
- **Saga pattern**: No distributed transaction management
- **Feature flags**: No runtime feature toggling system
- **Blue-green deployment**: No zero-downtime deployment strategy

## Risks
| Risk | Severity | Description |
|------|----------|-------------|
| Tight coupling | High | Business logic in services tightly coupled to FastAPI/HTTP layer |
| Sync worker thread | Medium | Background sync uses daemon thread instead of Celery/RQ workers |
| No API versioning strategy | Medium | v1 hardcoded; no migration path to v2 |
| Monolithic scaling | Medium | Cannot scale individual modules independently |
| No event sourcing | Low | Audit trail relies on manual `log_audit()` calls |

## Recommendations
1. Introduce Celery with Redis broker for background job processing
2. Implement API Gateway (Kong/Traefik) for centralized routing
3. Add feature flag system (LaunchDarkly or Unleash)
4. Separate read/write models for high-traffic endpoints
5. Add circuit breaker (pybreaker) for external API calls (Chapa, Telegram)

## Estimated Development Effort
- **High**: 4-6 weeks for event-driven refactor
- **Medium**: 2-3 weeks for API Gateway
- **Low**: 1 week for feature flags
