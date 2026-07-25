# Check if routes are actually accessible through the FastAPI app
from app.main import app
routes = [(r.path, getattr(r, 'methods', set())) for r in app.routes if hasattr(r, 'methods')]
print(f'Total API routes in app: {len(routes)}')
for p, m in sorted(routes, key=lambda x: x[0]):
    print(f'  {m} {p}')
