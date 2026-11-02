---
'@expressive/three': minor
---

`Asset` - a node for a glTF model. `url` loads once per URL and is cloned per instance; loading holds `ready`, so an owner is ready once every asset under it has loaded. `clip` plays a named animation on the nearest `Frame`, and `part(name)` reaches a loaded object for per-frame values.
