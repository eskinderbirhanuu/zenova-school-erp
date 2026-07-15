# File Reviewed

`frontend/src/components/3d/animated-background.tsx` (82 lines)

## Components

- `FloatingShape` — Three.js floating polyhedra with wireframe `MeshDistortMaterial`.
- `Scene` — 7 floating shapes.
- `AnimatedBackground` — full-screen canvas.

## Issues

### Issue 1 — Performance: `useMemo` for Geometry

- **Lines:** 24-31
- **Severity:** Good
- **Category:** Performance
- **Description:** Geometries are memoized to prevent re-creation on re-render.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
