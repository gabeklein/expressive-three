---
'@expressive/three': minor
---

Scene graph nodes as `State` classes: `Object3D`, `Group`, `Scene` and `Mesh` each own one three.js object, with `visible`, transforms, `geometry` and `material` as members stored on it. A node attaches under the nearest node owning it; destroying it detaches it. `Frame` runs per-frame callbacks without dispatching, and `loop()` drives it.
