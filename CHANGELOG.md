# @expressive/three

## 0.1.0

### Minor Changes

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`85acf8c`](https://github.com/gabeklein/expressive-three/commit/85acf8c3fe83bbf4528ed085bf595deec4708412) `Asset` - a node for a glTF model. `url` loads once per URL and is cloned per instance; loading holds `ready`, so an owner is ready once every asset under it has loaded. `clip` plays a named animation on the nearest `Frame`, and `part(name)` reaches a loaded object for per-frame values.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`64c66c3`](https://github.com/gabeklein/expressive-three/commit/64c66c3ac159eb2dc5aece2756602e84f336c853) Geometry and materials are reference-counted across the nodes holding them and disposed when the last one replaces them or is destroyed. Shared resources need no marking; one used again after disposal re-uploads on the next draw.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`5da3c0d`](https://github.com/gabeklein/expressive-three/commit/5da3c0db976acb1fd119b865c6e64b4a461a3d16) `OrthographicCamera`, fitted to the surface by its vertical extent, and lights - `AmbientLight`, `HemisphereLight`, `DirectionalLight`, `PointLight`, `SpotLight`, all `Light`. Color members follow the vector rule: assign to dispatch, mutate in place silently.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`a754f0d`](https://github.com/gabeklein/expressive-three/commit/a754f0dd9665adf2bab0559d7eb5181911a76058) `parent` places a node: unset, it draws under the nearest node owning it; a node draws there; `null` draws nowhere; an instruction may choose (`parent = get(World)`). `children` lists what draws under a node. Placement never changes lifetime - destroying a parent returns its placed nodes to their owner.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`9f62436`](https://github.com/gabeklein/expressive-three/commit/9f6243693ce4a9c3679f933f9727145512cb1f78) `Viewport` - the host-facing root. A subclass supplies `scene` and `camera`; `attach(canvas | gl)`, or `<canvas ref={viewport.canvas} />` in any host, draws every frame after its `Frame` ticks, sizing renderer and camera to the surface. Adds `PerspectiveCamera`. A node moved through `_object` instead of `parent` warns once and is put back.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`eaef527`](https://github.com/gabeklein/expressive-three/commit/eaef527aaa737acaac3233fa3f43adf96c98afc2) `position`, `rotation` and `scale` read as the three.js object's live vectors. Assigning a vector copies it in and dispatches when it changed; mutating in place is silent, and `set(key)` announces it. Vectors only - no tuple form. `lookAt()` takes a vector or `x, y, z`.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`281fa2d`](https://github.com/gabeklein/expressive-three/commit/281fa2de0029260efc3a7fdc9178bdc770a72c39) Built on `@expressive/mvc` 0.89: nodes extend `Model`, and the package re-exports `Model` (also as the default export) in place of `State`.

- [`2da9f7a`](https://github.com/gabeklein/expressive-three/commit/2da9f7af01ef1e87992780e1dc9128daa265c9a4) Scene graph nodes as `State` classes: `Object3D`, `Group`, `Scene` and `Mesh` each own one three.js object, with `visible`, transforms, `geometry` and `material` as members stored on it. A node attaches under the nearest node owning it; destroying it detaches it. `Frame` runs per-frame callbacks without dispatching, and `loop()` drives it.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`198a46f`](https://github.com/gabeklein/expressive-three/commit/198a46fd0ef57aea853af7e4d835c17826610c2c) `Scene` has `background`, `fog` and `environment` members.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`198a46f`](https://github.com/gabeklein/expressive-three/commit/198a46fd0ef57aea853af7e4d835c17826610c2c) `Viewport<R>` types the renderer a `draw()` override sees - `WebGLRenderer` by default, so `this._renderer.info` needs no cast.

### Patch Changes

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`0fc3942`](https://github.com/gabeklein/expressive-three/commit/0fc3942f47b4dd01fff3258961b38ee5779b23ae) Node members are typed from three.js's own declarations.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`198a46f`](https://github.com/gabeklein/expressive-three/commit/198a46fd0ef57aea853af7e4d835c17826610c2c) `loop()` caps a frame's step at 0.1s, so a tab returning from the background does not jump every handler forward.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`f32d167`](https://github.com/gabeklein/expressive-three/commit/f32d1674497d23c546d3628a8397960ec1f0d348) Requires `@expressive/mvc` 0.93. `Frame` no longer declares `static global`, which core removed.

- [#1](https://github.com/gabeklein/expressive-three/pull/1) [`198a46f`](https://github.com/gabeklein/expressive-three/commit/198a46fd0ef57aea853af7e4d835c17826610c2c) A camera assigned to a `Viewport` while attached is fitted to the surface, as the first one is on attach and resize.
