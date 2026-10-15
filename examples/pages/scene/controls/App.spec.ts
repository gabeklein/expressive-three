import { area, expect, green, red, test } from '../../../e2e';

test('will spawn until paused, and ping the nearest mob', async ({ page, open }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open('scene/controls');

  const stage = page.locator('canvas.stage');
  const spawned = async () => parseInt((await page.locator('.count').textContent())!);

  await page.clock.runFor(2000);
  expect(await spawned()).toBeGreaterThan(2);
  expect(await area(stage, red)).toBeGreaterThan(200);

  await page.getByRole('button', { name: 'Pause' }).click();
  const held = await spawned();

  await page.clock.runFor(3000);
  expect(await spawned()).toBe(held);

  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(1000);
  expect(await spawned()).toBeGreaterThan(held);

  expect(await area(stage, green)).toBe(0);
  await page.getByRole('button', { name: 'Ping' }).click();
  await page.clock.runFor(100);

  await expect(page.locator('.range')).toContainText('nearest');
  expect(await area(stage, green)).toBeGreaterThan(100);
});
