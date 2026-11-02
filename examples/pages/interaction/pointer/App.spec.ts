import { drawn, expect, green, test } from '../../../e2e';

const white = ([r, g, b]: number[]) => r > 200 && g > 200 && b > 200;

test('will light the crate under the pointer, inspect it, and spin it on click', async ({ page, open }) => {
  await open('interaction/pointer');

  const stage = page.locator('canvas.stage');
  const hit = page.locator('.hit');
  const { width, height } = (await stage.boundingBox())!;
  const at = (x: number) => ({ position: { x: width * x, y: height / 2 } });

  await drawn(stage, green);
  await expect(hit).toHaveText('Nothing under the pointer.');

  await stage.hover(at(0.5));
  await expect(hit).toHaveText('green');
  await drawn(stage, white);

  await stage.click(at(0.5));
  await expect(page.locator('.spinning')).toHaveText('yes');

  await stage.hover(at(0.66));
  await expect(hit).toHaveText('blue');
  await expect(page.locator('.spinning')).toHaveText('no');
  await drawn(stage, green);

  await page.mouse.move(0, 0);
  await expect(hit).toHaveText('Nothing under the pointer.');
});
