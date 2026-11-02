# AGENTS.md

Contributor guide for AI agents working in this repository.

## Overview

`@expressive/three` - a three.js scene graph built from [Expressive MVC](https://github.com/gabeklein/expressive-mvc) `Model` classes. Unreleased. [FEATURE.md](FEATURE.md) holds agreed scope and shape - update it in the PR that changes either. Expressive's own contract and conventions: [skills/SKILL.md](https://github.com/gabeklein/expressive-mvc/blob/main/skills/SKILL.md) - read the relevant parts before designing, and inspect source and tests before changing behavior.

A single package at the root, with changesets and release CI as in [expressive-orm](https://github.com/gabeklein/expressive-orm). Install, scripts and builds run under bun; tests run on vitest.

## Structure

```
src/              - @expressive/three
examples/         - playground: one page per example, each with a Playwright spec (see examples/AGENTS.md)
.github/scripts   - three-probe: drawing verified in Chrome
```

## Commands

```bash
bun install
bun run test        # typecheck + vitest with 100% coverage gates
bun run build       # tsdown to dist/
bun run probe       # draw in Chrome and read back pixels (set CHROME)
bun run examples    # playground dev server
bun run e2e         # every example's spec in Chromium
bun run changeset   # record a user-facing change
```

## Testing

Runner: **vitest** with istanbul coverage. Statements, branches, functions and lines gate at 100% - a conditional arm is either exercised by a test or deleted as dead code. CI blocks merges on it.

Tests live only in `*.test.ts` files beside the source they cover (`viewport.ts` → `viewport.test.ts`). Any other layout requires explicit permission first.

- Naming: `it('will …')`, `it('will not …')`, `it('will throw if …')`.
- `test.setup.ts` adds `await expect(state).toHaveUpdated(...keys)` / `.not.toHaveUpdated()` and `flushMicrotasks()`.
- `vi.fn()` for mocks, `vi.spyOn(...)` for spies; restore a console spy and assert on it.
- node has no WebGL - tests swap `Viewport`'s protected `createRenderer()` and `schedule()` for fakes.

### Verify runtime, not just build

`bun run probe` draws scenes through `Viewport` in Chrome (SwiftShader WebGL) and reads back pixels. A change to `Viewport`, `draw()`, placement, members or disposal is not verified until it passes - add a check for new drawing behavior. It skips when Chrome is absent; set `CHROME` to a binary. If runtime was not exercised, say so plainly instead of reporting "passes".

## Conventions

- **Thin over three.** Nodes project three.js objects; three does the work. The catalogue is generated - `node(THREE.X, keys, base?)`, one line per class, members typed from three's own declarations. Do not hand-write what three already declares, and do not chase three releases - the peer range stays wide.
- **Key lists are the contract** - what is reactive - and stay explicit. Transforms and colors follow expressive's in-place rule: assign to dispatch, mutate in place silently.
- **Core changes go upstream.** Build only on published `@expressive/mvc` API - no internal imports. A missing seam is a PR to expressive-mvc, not a workaround here.
- Merged code carries essentially no comments. Keep one only where the code would otherwise be misread.
- **Always ask before adding public surface** - anything reachable from `src/index.ts`. Prefer reusing or reshaping existing surface; propose and wait for a decision.
- Write docs for token economy: cut meta-framing, intensifiers and redundant clauses; prefer a dash over a connective phrase.

## Change flow

- Work on a named branch (`feat/…`, `fix/…`, `chore/…`) in a git worktree, never directly on a scratch branch.
- PRs target `main`. A stacked PR targets the branch below it and says so in its first line; GitHub retargets it as the stack merges. Bring a lower branch's changes up by merging, not by force-pushing.
- For new features and non-trivial refactors, capture agreed scope, key decisions and approach in the PR description before implementation - it is the shared plan and review context.
- Prefer more, logically scoped commits - PRs squash on merge.
- Write a changeset (`bun run changeset`) for a user-facing change: feature, behavior change, API addition, breaking change. None for internal refactors, test-only changes or fixes with no observable effect.
- Weigh bundle size as one cost among others; mention notable growth in the PR.
- An open PR is not a stopping point. On merge of a leaf branch, remove its worktree and local branch. A PR closed without merging, or review pushback, is surfaced to the user - never cleaned up silently.

### Git hygiene

- Branch from `origin/main`. Never assume an upstream exists - a branch's first push is `git push -u origin <branch>`.
- Pushing publishes. Don't push a branch or open a PR beyond what the task calls for.
- Never use `git stash` as scratch - copy files aside or use a worktree.
- Before removing a worktree or running `git clean`, check untracked files (`git status --porcelain` plus `git ls-files --others --exclude-standard`).
- Commit messages carry no AI attribution - no `Co-authored-by` bot trailers, no "Generated with" footers.

### Releasing

- `@expressive/three` is `private` until its first release; changesets still versions it and writes its changelog.
- Merged changesets accumulate on `main`; CI maintains a "Version Packages" PR. Merging it publishes from CI via npm trusted publishing - see [.github/workflows/README.md](.github/workflows/README.md). No local publishing.
