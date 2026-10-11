---
'@expressive/three': minor
---

`parent` places a node: unset, it draws under the nearest node owning it; a node draws there; `null` draws nowhere; an instruction may choose (`parent = get(World)`). `children` lists what draws under a node. Placement never changes lifetime - destroying a parent returns its placed nodes to their owner.
