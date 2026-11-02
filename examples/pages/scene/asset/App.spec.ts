import { dark, drawn, expect, test, type Pixel } from '../../../e2e';

const red = ([r, g, b]: Pixel) => r > 150 && g < 80 && b < 80;
const blue = ([r, g, b]: Pixel) => b > 150 && r < 80 && g < 80;

test('will load the robot, play its clip and grow its head', async ({ page, open }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open('scene/asset');

  const stage = page.locator('canvas.stage');
  const status = page.locator('.status');

  await expect(status).toHaveText('loaded, still');
  await page.clock.runFor(100);

  const box = (await stage.boundingBox())!;
  const half = 3 * (box.width / box.height);
  const x = (world: number) => 0.5 + world / (2 * half);
  const y = (world: number) => (3.5 - world) / 6;

  await drawn(stage, red, x(0), y(0));
  await drawn(stage, blue, x(0), y(1.4));
  await drawn(stage, dark, x(1.4), y(1.4));

  await page.getByRole('button', { name: 'Slide' }).click();
  await expect(status).toHaveText('loaded, Slide');
  await page.clock.runFor(1000);

  await drawn(stage, blue, x(1.4), y(1.4));
  await drawn(stage, dark, x(0), y(1.4));

  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(status).toHaveText('loaded, still');
  await page.clock.runFor(500);
  await drawn(stage, blue, x(0), y(1.4));

  await drawn(stage, dark, x(0), y(1.95));
  await page.getByRole('button', { name: 'Grow' }).click();
  await page.clock.runFor(100);
  await drawn(stage, blue, x(0), y(1.95));
});
