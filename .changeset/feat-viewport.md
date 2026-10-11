---
'@expressive/three': minor
---

`Viewport` - the host-facing root. A subclass supplies `scene` and `camera`; `attach(canvas | gl)`, or `<canvas ref={viewport.canvas} />` in any host, draws every frame after its `Frame` ticks, sizing renderer and camera to the surface. Adds `PerspectiveCamera`. A node moved through `_object` instead of `parent` warns once and is put back.
