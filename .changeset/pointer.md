---
'@expressive/three': minor
---

`Pointer` - a Viewport's `pointer` finds the nearest `interactive` node under the pointer every frame as `hit`, with `point` and `pressed`, all read-only state. A click dispatches `Pointer.click` on the node and each node it draws under. Nodes gain an `interactive` field, default false.
