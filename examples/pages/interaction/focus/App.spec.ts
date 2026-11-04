import { area, drawn, expect, green, test } from '../../../e2e';

const white = ([r, g, b]: number[]) => r > 200 && g > 200 && b > 200;

test('will light the crate in focus, inspect it, and spin it on select', async ({ page, open }) => {
  await open('interaction/focus');

  const stage = page.locator('canvas.stage');
  const hit = page.locator('.hit');
  const { width, height } = (await stage.boundingBox())!;
  const at = (x: number) => ({ position: { x: width * x, y: height / 2 } });

  await drawn(stage, green);
  await expect(hit).toHaveText('Nothing in focus.');

  await stage.hover(at(0.5));
  await expect(hit).toHaveText('green');
  await expect(page.locator('.focus')).toHaveText('yes');
  await drawn(stage, white);

  await stage.click(at(0.5));
  await expect(page.locator('.spinning')).toHaveText('yes');

  await stage.hover(at(0.66));
  await expect(hit).toHaveText('blue');
  await expect(page.locator('.spinning')).toHaveText('no');
  await drawn(stage, green);

  await page.mouse.move(0, 0);
  await expect(hit).toHaveText('Nothing in focus.');
});

test.describe('on a touchscreen', () => {
  test.use({ hasTouch: true });

  test('will select a crate tapped without aiming first', async ({ page, open }) => {
    await open('interaction/focus');

    const stage = page.locator('canvas.stage');

    await drawn(stage, green);

    const still = await area(stage, green);

    await stage.tap();
    await expect(page.locator('.hit')).toHaveText('Nothing in focus.');
    await expect.poll(() => area(stage, green), { timeout: 10_000 }).toBeGreaterThan(still * 1.15);
  });
});
