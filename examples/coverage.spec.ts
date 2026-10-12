import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import groups from './pages';

test('will have a spec beside every page', async () => {
  const missing: string[] = [];

  for (const group of groups) {
    const { default: pages } = await import(`./pages/${group}/index.ts`);

    for (const page of pages as string[]) {
      const spec = fileURLToPath(new URL(`./pages/${group}/${page}/App.spec.ts`, import.meta.url));
      if (!existsSync(spec)) missing.push(`${group}/${page}`);
    }
  }

  expect(missing).toEqual([]);
});
