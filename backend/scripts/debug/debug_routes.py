import sys
from app.api.v1.endpoints import health
print(f'health routes before include: {len(health.router.routes)}')

from app.api.v1.endpoints import auth
print(f'auth routes before include: {len(auth.router.routes)}')

# Now import the router afresh
sys.modules.pop('app.api.v1.router', None)
from app.api.v1 import router as router_mod

print(f'After include: health routes={len(health.router.routes)}')
print(f'After include: auth routes={len(auth.router.routes)}')

# Check the parent
print(f'Parent router direct count: {len(router_mod.router.routes)}')

# Inspect included router
for r in router_mod.router.routes:
    tn = type(r).__name__
    rc = len(getattr(r, 'routes', []))
    print(f'  {tn} routes_inner={rc}')
    break
