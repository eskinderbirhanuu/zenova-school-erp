# Check if the router properly includes routes
import sys
sys.modules.pop('app.api.v1.router', None)
sys.modules.pop('app.api.v1', None)

import importlib
mod = importlib.import_module('app.api.v1.router')

parent = mod.router
print('Parent router.routes count:', len(parent.routes))

first = parent.routes[1]
print('Type:', type(first).__name__)
print('Has app:', hasattr(first, 'app'))
print('Has prefix:', hasattr(first, 'prefix'))
