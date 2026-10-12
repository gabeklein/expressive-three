import { drawn, expect, red, test } from '../../../e2e';

test('will draw the box and change its speed', async ({ page, open }) => {
  await open('essentials/spin');

  const stage = page.locator('canvas.stage');

  await drawn(stage, red);
  await drawn(stage, ([r, g, b]) => r < 60 && g < 60 && b < 70, 0.02, 0.05);

  await page.getByRole('button', { name: 'Faster' }).click();
  await expect(page.locator('.speed')).toHaveText('2x');
});
