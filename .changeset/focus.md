---
'@expressive/three': minor
---

Focus - `focus = focusable()` makes a node focusable, reading true while a source aims at it. A Viewport's `focus` is the pointer over its canvas (mouse, touch, pen): `hit`, `point` and `pressed` are read-only state, and a press released over a node dispatches `Focus.select` on it and each node it draws under.
