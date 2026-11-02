import type { Locator } from '@playwright/test';

import { dark, drawn, expect, red, test } from '../../../e2e';

test('will count shared geometry once and free it with its last holder', async ({ page, open }) => {
  await open('resources/swap');

  const stage = page.locator('canvas.stage');
  const geometries = page.locator('.geometries');
  const slot = (index: number) => page.locator('.slot').nth(index);
  const corner = (index: number) => spot(stage, index, 0.6, 0.6);
  const center = (index: number) => spot(stage, index, 0, 0);

  await drawn(stage, red, ...(await corner(1)));
  await expect(geometries).toHaveText('1');

  await slot(1).getByRole('button', { name: 'Swap' }).click();
  await expect(slot(1).locator('code')).toHaveText('sphere');
  await drawn(stage, dark, ...(await corner(1)));
  await drawn(stage, red, ...(await center(1)));
  await drawn(stage, red, ...(await corner(0)));
  await expect(geometries).toHaveText('2');

  await slot(0).getByRole('button', { name: 'Swap' }).click();
  await drawn(stage, dark, ...(await corner(0)));
  await expect(geometries).toHaveText('2');

  await slot(2).getByRole('button', { name: 'Swap' }).click();
  await drawn(stage, dark, ...(await corner(2)));
  await expect(geometries).toHaveText('1');

  await slot(1).getByRole('button', { name: 'Swap' }).click();
  await expect(slot(1).locator('code')).toHaveText('torus');
  await drawn(stage, dark, ...(await center(1)));
  await expect(geometries).toHaveText('2');

  await slot(3).getByRole('button', { name: 'Add box' }).click();
  await drawn(stage, red, ...(await corner(3)));
  await expect(geometries).toHaveText('3');

  await slot(3).getByRole('button', { name: 'Remove' }).click();
  await drawn(stage, dark, ...(await center(3)));
  await expect(geometries).toHaveText('2');
});

/** Point `dx`, `dy` world units from a slot's center - the camera spans 4 units vertically. */
async function spot(stage: Locator, slot: number, dx: number, dy: number): Promise<[number, number]> {
  const { width, height } = (await stage.boundingBox())!;
  const x = (slot - 1.5) * 2.2 + dx;

  return [0.5 + (x * height) / (4 * width), 0.5 - dy / 4];
}
