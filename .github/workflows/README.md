# CI/CD Workflow Overview

## pr.yml (pull requests -> any branch)

Blocking: `bun run test` (typecheck plus 100% coverage gates) and `bun run build`. Runs for PRs into any branch, so stacked PRs are verified too. The frozen-lockfile install in the `setup` action guards the lockfile.

Non-blocking signals: `changeset status` against the PR's base (a preview of which packages would bump) and `npm publish --dry-run` pack validation.

`bun run probe` (drawing in Chrome) is not in CI - run it locally for changes to drawing, placement, members or disposal.

## release.yml (push -> main)

`changesets/action` maintains the "Version Packages" PR (`changeset version` + `bun install` so the lockfile stays consistent with the bumps). Merging that PR builds the packages and runs `changeset publish`.

`@expressive/three` is `private` until its first release - changesets still versions it and writes its changelog, and `changeset publish` skips it. To release: drop `private`, publish a stub manually (npm trusted publishing needs the package to exist), attach the trusted publisher for this workflow filename under the GitHub `release` environment (deployment branches restricted to `main`), then release normally. Renaming this file breaks the npm-side config.
