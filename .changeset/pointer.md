---
'@expressive/three': minor
---

Pointer - `focus = pointer(handlers?)` makes a node a pointer target; the field reads `{ point, sources }` while aimed at, else `undefined`. Handlers take `select`, `hold` and `drag` - a function alone is `select`, and `hold`/`drag` may return a function run when the gesture ends. While aimed at, `focus.select/hold/drag(fn)` add listeners dropped when aim leaves. A Viewport's `pointer` is the source for its canvas (mouse, touch, pen), with read-only `hit`, `point` and `pressed`.
