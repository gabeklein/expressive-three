---
'@expressive/three': minor
---

`keyboard(keys, handlers?)` - an instruction binding keys to a field on any Model. The field reads a press while any of its keys is held, else `undefined`, dispatching only when the press starts and ends. Keys are physical, by short name (`'W'`, `'1'`, `'Shift'` for either side, `'Space'`, `'ArrowLeft'`); an array binds alternates. `tap` and `hold` (past 0.5s on the nearest `Frame`, may return an end function) mirror `pointer()`. Bound keys skip editable targets and have their browser default prevented; every key releases on blur.
