# Frontend Protection

## Overview

Frontend code (JavaScript/TypeScript) runs on the client's browser and is inherently exposed. While it cannot be fully hidden, it can be made significantly more expensive to reverse engineer through minification, obfuscation, and watermarking.

## Current State

### What Exists
| Protection | Status | Detail |
|-----------|--------|--------|
| Next.js production build | ✅ Enabled | Automatic minification + tree-shaking |
| Source maps in production | ✅ Should be disabled | `productionBrowserSourceMaps: false` |
| Environment variable injection | ✅ `NEXT_PUBLIC_*` at build time | Build-time only |
| React component splitting | ✅ Dynamic imports | Code splitting |
| JavaScript obfuscation | ❌ Not implemented | Raw JS in bundle |
| Watermark injection | ⚠️ Partial | `window.__ZENOVA_SCHOOL__` exists but defaults to "dev" |
| Console/DevTools blocking | ❌ Not implemented | Developer tools accessible |
| Anti-debugging | ❌ Not implemented | No debugger detection |

### What Ships in the Bundle
```
.next/static/chunks/
  ├── pages/                    ← Route components (source-mapped)
  ├── framework-*.js            ← Next.js framework
  ├── main-*.js                 ← App logic
  └── webpack-*.js              ← Webpack runtime
```

## Protection Layers

### Layer 1 — Enhanced Build Configuration

```javascript
// next.config.ts
const NextBundleAnalyzer = require('@next/bundle-analyzer');

module.exports = {
  productionBrowserSourceMaps: false,  // No source maps in prod
  swcMinify: true,                      // SWC minification (faster than Terser)
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],       // Remove console.log in prod
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.minimize = true;
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,       // Aggressive console removal
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info'],
            },
            mangle: {
              reserved: ['__ZENOVA_SCHOOL__'],  // Don't mangle watermark
            },
            output: {
              comments: false,           // Remove all comments
            },
          },
        }),
      ];
    }
    return config;
  },
};
```

### Layer 2 — JavaScript Obfuscation

**Tool:** `javascript-obfuscator` (webpack plugin)

```bash
npm install --save-dev webpack-obfuscator javascript-obfuscator
```

```javascript
// next.config.ts webpack config
const JavaScriptObfuscator = require('webpack-obfuscator');

if (!isServer) {
  config.plugins.push(
    new JavaScriptObfuscator({
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: true,
      debugProtectionInterval: true,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ['rc4'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 4,
      stringArrayWrappersType: 'function',
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: true,
    })
  );
}
```

**Performance Impact:**
- Bundle size increase: 30-80%
- Parse time increase: 50-150ms
- Execution speed: minimal impact

### Layer 3 — Watermark Injection

```typescript
// In _app.tsx or layout.tsx
// This is injected by the backend build process per school

// Force immutable watermark
Object.defineProperty(window, '__ZENOVA_SCHOOL__', {
  value: process.env.NEXT_PUBLIC_SCHOOL_WATERMARK || 'unknown',
  writable: false,
  configurable: false,
});

// Tamper detection — alert if watermark is modified
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj: any, prop: string, desc: PropertyDescriptor) {
  if (prop === '__ZENOVA_SCHOOL__') {
    console.error('Tampering detected:', new Error().stack);
    // Optionally: send report to license server
  }
  return originalDefineProperty.call(this, obj, prop, desc);
};
```

### Layer 4 — DevTools Detection

```typescript
// Anti-debugging (optional — use with caution)
function detectDevTools(): void {
  const threshold = 160; // Height difference threshold
  
  setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      // DevTools detected — optional actions
      // Option A: Log warning
      console.warn('Developer tools detected');
      
      // Option B: Disable some functionality
      // (Not recommended — degrades UX for legitimate users)
    }
  }, 2000);
}
```

### Layer 5 — SRI (Subresource Integrity)

```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval'",  // unsafe-eval needed for obfuscation
          },
        ],
      },
    ];
  },
};
```

## Implementation Plan

### Phase 1 (1 day)
1. Disable source maps in production
2. Remove console.log in production builds
3. Configure SWC minification

### Phase 2 (2 days)
4. Integrate javascript-obfuscator webpack plugin
5. Test all pages after obfuscation (ensure no runtime errors)
6. Verify performance impact is acceptable

### Phase 3 (1 day)
7. Implement per-school watermark injection
8. Add watermark tamper detection
9. Verify `window.__ZENOVA_SCHOOL__` is properly set

## Testing Obfuscation

```bash
# Verify source maps are disabled
grep -r "sourceMappingURL" .next/static/  # Should be empty

# Verify console.log removal
grep -r "console\.log" .next/static/chunks/  # Should be empty (except errors)

# Check bundle size
du -sh .next/static/chunks/pages/

# Verify obfuscation
head -c 500 .next/static/chunks/pages/index-*.js  # Should be unreadable
```

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Obfuscation breaks app | Test all pages, use lower thresholds initially |
| Performance degradation | Monitor bundle size, parse time, Time-to-Interactive |
| DevTools blocking breaks UX | Only log, never break functionality |
| Source maps leaked in error | Configure error reporting to strip paths |
| Obfuscated code crashes differently | Add Sentry error tracking for all environments |
