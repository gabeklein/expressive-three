# AGENTS.md

`@expressive/three` - a three.js scene graph built from [Expressive MVC](https://github.com/gabeklein/expressive-mvc) `State` classes. Unreleased. [FEATURE.md](FEATURE.md) holds agreed scope and shape - update it in the PR that changes either. Expressive's own contract and conventions: [skills/SKILL.md](https://github.com/gabeklein/expressive-mvc/blob/main/skills/SKILL.md).

## Commands

```bash
bun install
bun run test       # typecheck + vitest with 100% coverage gates
bun run build      # tsdown to dist/
bun run probe      # draw in Chrome and read back pixels (set CHROME)
```

## Testing

- vitest with istanbul; statements, branches, functions and lines gate at 100% - a conditional arm is exercised by a test or deleted.
- Tests live in `*.test.ts` beside the file they cover.
- Naming: `it('will …')`, `it('will not …')`, `it('will throw if …')`.
- `test.setup.ts` adds `await expect(state).toHaveUpdated(...keys)` and `flushMicrotasks()`.

### Verify runtime, not just build

`bun run probe` draws scenes through `Viewport` in Chrome (SwiftShader WebGL) and reads back pixels. A change to `Viewport`, `draw()`, placement, members or disposal is not verified until it passes. It skips when Chrome is absent; set `CHROME` to a binary. happy-dom and node have no WebGL - unit tests use a fake renderer.

## Conventions

- Merged code carries essentially no comments - keep one only where the code would otherwise be misread.
- Always ask before adding public surface: anything reachable from `src/index.ts`.
- Prefer several logically scoped commits; PRs squash on merge. Feature work goes on a named branch (`feat/…`, `fix/…`) in a worktree.
- Commit messages carry no AI attribution.
- Changes needed in `@expressive/mvc` are PRs to that repo, not workarounds here.
