---
'@expressive/three': minor
---

`position`, `rotation` and `scale` read as the three.js object's live vectors. Assigning a vector copies it in and dispatches when it changed; mutating in place is silent, and `set(key)` announces it. Vectors only - no tuple form. `lookAt()` takes a vector or `x, y, z`.
