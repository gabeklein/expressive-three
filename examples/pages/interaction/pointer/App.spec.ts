import type { Page } from '@playwright/test';

import { area, dark, drawn, expect, green, test } from '../../../e2e';

const white = ([r, g, b]: number[]) => r > 200 && g > 200 && b > 200;
const gold = ([r, g, b]: number[]) => r > 200 && g > 150 && b < 80;

async function stage(page: Page) {
  const canvas = page.locator('canvas.stage');
  const box = (await canvas.boundingBox())!;
  const at = (x: number, y = 0.5) => [box.x + box.width * x, box.y + box.height * y] as const;

  await drawn(canvas, green);

  return { canvas, at };
}

async function aim(page: Page, [x, y]: readonly [number, number]) {
  await page.mouse.move(x, y);
}

test('will light the crate under the pointer, inspect it, and spin it on select', async ({ page, open }) => {
  await open('interaction/pointer');

  const { canvas, at } = await stage(page);
  const hit = page.locator('.hit');

  await expect(hit).toHaveText('Nothing under the pointer.');

  await aim(page, at(0.5));
  await expect(hit).toHaveText('green');
  await expect(page.locator('.focus')).toHaveText('yes');
  await drawn(canvas, white);

  await page.mouse.down();
  await expect(page.locator('.pressed')).toHaveText('yes');
  await page.mouse.up();
  await expect(page.locator('.spinning')).toHaveText('yes');

  await aim(page, at(0.66));
  await expect(hit).toHaveText('blue');
  await expect(page.locator('.spinning')).toHaveText('no');
  await drawn(canvas, green);

  await page.mouse.move(0, 0);
  await expect(hit).toHaveText('Nothing under the pointer.');
});

test('will charge a held crate until release, without selecting it', async ({ page, open }) => {
  await open('interaction/pointer');

  const { canvas, at } = await stage(page);

  await aim(page, at(0.5));
  await page.mouse.down();
  await expect(page.locator('.charging')).toHaveText('yes');
  await drawn(canvas, gold);

  await page.mouse.up();
  await expect(page.locator('.charging')).toHaveText('no');
  await expect(page.locator('.spinning')).toHaveText('no');
  await drawn(canvas, white);
});

test('will drag a crate and drop it where the pointer is', async ({ page, open }) => {
  await open('interaction/pointer');

  const { canvas, at } = await stage(page);

  await aim(page, at(0.5));
  await page.mouse.down();
  await page.mouse.move(...at(0.5, 0.25), { steps: 8 });
  await drawn(canvas, white, 0.5, 0.25);
  await page.mouse.up();

  await drawn(canvas, dark, 0.5, 0.5);
  await expect(page.locator('.hit')).toHaveText('green');
  await expect(page.locator('.spinning')).toHaveText('no');
});

test.describe('on a touchscreen', () => {
  test.use({ hasTouch: true });

  test('will select a crate tapped without aiming first', async ({ page, open }) => {
    await open('interaction/pointer');

    const { canvas } = await stage(page);
    const still = await area(canvas, green);

    await canvas.tap();
    await expect(page.locator('.hit')).toHaveText('Nothing under the pointer.');
    await expect.poll(() => area(canvas, green), { timeout: 10_000 }).toBeGreaterThan(still * 1.15);
  });
});

