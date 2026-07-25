# Debug: Try to simulate what main.py does
import sys
for key in list(sys.modules.keys()):
    if 'app' in key:
        del sys.modules[key]

# Step by step
from app.api.v1.router import router as v1_router

from fastapi import FastAPI
app = FastAPI()

# Count routes in v1_router BEFORE including
routes = [(r.path, getattr(r, 'methods', set())) for r in v1_router.routes if hasattr(r, 'methods')]
print('V1 router routes before include:', len(routes))
for p, m in sorted(routes, key=lambda x: x[0]):
    print(' ', m, p)

app.include_router(v1_router)

# Count AFTER
routes = [(r.path, getattr(r, 'methods', set())) for r in app.routes if hasattr(r, 'methods')]
print('\nApp routes after include:', len(routes))
for p, m in sorted(routes, key=lambda x: x[0]):
    print(' ', m, p)
