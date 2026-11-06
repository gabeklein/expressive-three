import { area, expect, pixel, test } from '../../../e2e';

const lit = ([r, g, b]: number[]) => r + g + b > 150;
const sum = ([r, g, b]: number[]) => r + g + b;

const apart = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

test('will draw a lit yard with shadows, lose them when switched off, and orbit on drag', async ({ page, open }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open('look/night');

  const stage = page.locator('canvas.stage');
  const frames = async (count: number) => {
    for (let i = 0; i < count; i++) await page.clock.runFor(16);
  };

  await expect
    .poll(async () => {
      await frames(3);
      return area(stage, lit);
    }, { timeout: 15_000 })
    .toBeGreaterThan(2000);

  const shadowed = await pixel(stage, 0.33, 0.63);

  await page.getByRole('button', { name: 'Switch shadows off' }).click();
  await expect(page.locator('.shadows')).toHaveText('shadows off');
  await frames(3);

  expect(sum(await pixel(stage, 0.33, 0.63)) - sum(shadowed)).toBeGreaterThan(40);

  const orb = await pixel(stage, 0.566, 0.68);
  const box = (await stage.boundingBox())!;

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await frames(30);

  expect(apart(await pixel(stage, 0.566, 0.68), orb)).toBeGreaterThan(60);
});
