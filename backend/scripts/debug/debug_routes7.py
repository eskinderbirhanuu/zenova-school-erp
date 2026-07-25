# Check if router import has errors
import sys
for key in list(sys.modules.keys()):
    if 'app' in key or 'app' in key:
        del sys.modules[key]

import traceback
try:
    from app.api.v1.router import router
    routes = [(r.path, getattr(r, 'methods', set())) for r in router.routes if hasattr(r, 'methods')]
    print('routes in router:', len(routes))
except Exception as e:
    traceback.print_exc()
