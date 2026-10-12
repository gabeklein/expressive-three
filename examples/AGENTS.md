# examples/AGENTS.md

Guide for the examples playground - a Vite app on `@expressive/dom`, one page per example, navigable from its index. Pages exist to be read, run and tinkered with: the source is the content.

```bash
bun run examples          # dev server - index at /, a page at /?page=<group>/<page>
bun run e2e               # typecheck examples, then every spec in Chromium (set CHROME to a binary)
bunx playwright test -c examples pages/<group>/   # one group
```

## Page conventions (`pages/<group>/<page>/App.tsx`)

Declaration order:

1. Imports, then module constants.
2. `export default` - a frame: `<div className="container">` holding the `<h1>`, the descriptive `<p>`, the demo as an element (`<Spinning />`), and any trailing `<small>` note. The export comes first because it is what the reader looks for.
3. Supporting classes and components - scene nodes first, then the `Viewport`, then the demo `Component`.
4. Helper functions last.

Style:

- All descriptive copy lives in the frame. Copy over comments: anything a comment would explain belongs in the page's visible copy. Keep a comment only for cryptic math.
- The demo is a `Component` (from `@expressive/mvc`) owning its `Viewport` as a field (`game = new Game()`) and rendering `<canvas className="stage" ref={this.game.canvas} />` plus any controls. Destroying the page destroys the game.
- `new Child()` for owned nodes, never `Child.new()`. Owned collections use `has()`.
- Animate inside `frame.each` by mutating live vectors (`this.rotation.y += …`); assign to place. Never animate by assignment.
- Build on `@expressive/three`'s public exports only. Primitives come from `three` (`BoxGeometry`, `Color`, `Vector3`). Something awkward to express is a finding - note it in the PR, don't work around it with `_object`.
- One idea per page. Name demo components for their role, never `Demo`.
- Reuse the theme tokens in `global.css` (`--s1..6`, `--accent`, `--surface`, `.stage`, `.controls`); register each page in its group's `index.ts`.

## Specs

Each page has a Playwright spec beside it: `pages/<group>/<page>/App.spec.ts`. `coverage.spec.ts` fails when a page lacks one.

- Import from `e2e.ts`: `test`, `expect`, and the pixel helpers - `pixel(locator, x, y)`, `drawn(locator, test, x, y)` (polls until the colour matches), `red`, `dark`. Coordinates run 0..1 across and down the canvas.
- `open('<group>/<page>')` loads the page; any `pageerror` or `console.error` fails the test.
- Drive the page's own story, the one its copy states: click its controls, then assert what is drawn and what is shown. Assert colours with tolerant predicates - SwiftShader antialiases edges, so sample away from them.
- WebGL runs on SwiftShader in headless Chromium; frames arrive through `requestAnimationFrame`. Poll with `drawn` rather than asserting a single frame.
