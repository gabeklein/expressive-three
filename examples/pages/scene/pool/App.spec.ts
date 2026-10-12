import type { Locator } from '@playwright/test';
import { dark, drawn, expect, red, test } from '../../../e2e';

async function slot(stage: Locator, index: number) {
  const { width, height } = (await stage.boundingBox())!;
  const x = (index - 2.5) * 2;

  return 0.5 + x / (6 * (width / height));
}

test('will spawn by placing and despawn without destroying', async ({ page, open }) => {
  await open('scene/pool');

  const stage = page.locator('canvas.stage');
  const spawn = page.getByRole('button', { name: 'Spawn', exact: true });
  const despawn = page.getByRole('button', { name: 'Despawn' });
  const third = await slot(stage, 2);
  const fourth = await slot(stage, 3);

  await expect(page.locator('.drawn')).toHaveText('0 drawn');
  await drawn(stage, dark, third);

  for (let i = 0; i < 3; i++) await spawn.click();

  await expect(page.locator('.drawn')).toHaveText('3 drawn');
  await expect(page.locator('.created')).toHaveText('3 created');
  await drawn(stage, red, await slot(stage, 0));
  await drawn(stage, red, third);
  await drawn(stage, dark, fourth);

  await despawn.click();

  await expect(page.locator('.drawn')).toHaveText('2 drawn');
  await expect(page.locator('.idle')).toHaveText('1 idle');
  await expect(page.locator('.created')).toHaveText('3 created');
  await drawn(stage, dark, third);

  await spawn.click();

  await expect(page.locator('.drawn')).toHaveText('3 drawn');
  await expect(page.locator('.idle')).toHaveText('0 idle');
  await expect(page.locator('.created')).toHaveText('3 created');
  await drawn(stage, red, third);

  await spawn.click();

  await expect(page.locator('.created')).toHaveText('4 created');
  await drawn(stage, red, fourth);
});
