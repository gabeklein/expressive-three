---
'@expressive/three': minor
---

Geometry and materials are reference-counted across the nodes holding them and disposed when the last one replaces them or is destroyed. Shared resources need no marking; one used again after disposal re-uploads on the next draw.
