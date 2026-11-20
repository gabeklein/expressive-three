import type { Page } from '@playwright/test';

import { drawn, expect, test } from '../../../e2e';

const white = ([r, g, b]: number[]) => r > 200 && g > 200 && b > 200;
const gold = ([r, g, b]: number[]) => r > 200 && g > 150 && b < 80;

async function rested(page: Page) {
  const [x, z] = (await page.locator('.rested').textContent())!.split(', ').map(Number);

  return { x, z };
}

test.beforeEach(async ({ page, open }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open('interaction/keyboard');
  await page.clock.runFor(100);
  await drawn(page.locator('canvas.stage'), white);
});

test('will drive while keys are held, sprint with shift, and show where it rested', async ({ page }) => {
  const canvas = page.locator('canvas.stage');
  const held = page.locator('.held');

  await expect(held).toHaveText('nothing');

  await page.keyboard.down('KeyW');
  await expect(held).toHaveText('forward');
  await page.clock.runFor(1000);
  await page.keyboard.up('KeyW');
  await expect(held).toHaveText('nothing');

  const walked = await rested(page);

  expect(walked.x).toBe(0);
  expect(walked.z).toBeLessThan(-2.5);
  expect(walked.z).toBeGreaterThan(-3.5);

  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowRight');
  await expect(held).toHaveText('right, sprint');
  await page.clock.runFor(1000);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Shift');

  const sprinted = await rested(page);

  expect(sprinted.x).toBeGreaterThan(7);
  expect(sprinted.z).toBe(walked.z);

  await drawn(canvas, white);
});

test('will charge gold on a held space, and not on a tap', async ({ page }) => {
  const canvas = page.locator('canvas.stage');
  const charging = page.locator('.charging');

  await page.keyboard.down('Space');
  await expect(page.locator('.held')).toHaveText('jump');
  await page.clock.runFor(200);
  await page.keyboard.up('Space');
  await page.clock.runFor(100);
  await expect(charging).toHaveText('no');

  await page.clock.runFor(1000);
  await page.keyboard.down('Space');
  await page.clock.runFor(700);
  await expect(charging).toHaveText('yes');
  await drawn(canvas, gold);

  await page.keyboard.up('Space');
  await expect(charging).toHaveText('no');
});
