# @expressive/three

## 0.1.0

### Minor Changes

- [`2da9f7a`](https://github.com/gabeklein/expressive-three/commit/2da9f7af01ef1e87992780e1dc9128daa265c9a4) Scene graph nodes as `State` classes: `Object3D`, `Group`, `Scene` and `Mesh` each own one three.js object, with `visible`, transforms, `geometry` and `material` as members stored on it. A node attaches under the nearest node owning it; destroying it detaches it. `Frame` runs per-frame callbacks without dispatching, and `loop()` drives it.
