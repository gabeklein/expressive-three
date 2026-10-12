---
'@expressive/three': patch
---

`loop()` caps a frame's step at 0.1s, so a tab returning from the background does not jump every handler forward.
