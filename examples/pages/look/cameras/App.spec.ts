import { dark, drawn, expect, red, test } from '../../../e2e';

const ABOVE = 0.42;

test('will shrink the far crate in perspective and not in orthographic', async ({ page, open }) => {
  await open('look/cameras');

  const stage = page.locator('canvas.stage');

  await drawn(stage, red);
  await drawn(stage, dark, 0.5, ABOVE);

  await page.getByRole('button', { name: 'Orthographic' }).click();
  await drawn(stage, red, 0.5, ABOVE);

  await page.getByRole('button', { name: 'Perspective' }).click();
  await drawn(stage, dark, 0.5, ABOVE);
});

test('will fit the orthographic width without stretching', async ({ page, open }) => {
  await open('look/cameras');

  const stage = page.locator('canvas.stage');
  const { width, height } = (await stage.boundingBox())!;
  const half = (0.1 * height) / width;

  await page.getByRole('button', { name: 'Orthographic' }).click();
  await drawn(stage, red, 0.5, ABOVE);
  await drawn(stage, red, 0.5 - 0.7 * half, 0.5);
  await drawn(stage, dark, 0.5 - 1.4 * half, 0.5);
});

test('will update projection as fov and zoom are assigned', async ({ page, open }) => {
  await open('look/cameras');

  const stage = page.locator('canvas.stage');

  await drawn(stage, dark, 0.5, ABOVE);
  await page.getByLabel('fov').fill('15');
  await expect(page.locator('.fov')).toHaveText('15°');
  await drawn(stage, red, 0.5, ABOVE);

  await page.getByRole('button', { name: 'Orthographic' }).click();
  await drawn(stage, red, 0.5, ABOVE);
  await page.getByLabel('zoom').fill('0.5');
  await expect(page.locator('.zoom')).toHaveText('0.5x');
  await drawn(stage, dark, 0.5, ABOVE);
});

test('will ride the orbit with the follow camera', async ({ page, open }) => {
  await open('look/cameras');

  const stage = page.locator('canvas.stage');

  await drawn(stage, dark, 0.5, ABOVE);
  await page.getByRole('button', { name: 'Follow' }).click();
  await expect(page.getByRole('button', { name: 'Follow' })).toHaveAttribute('aria-pressed', 'true');
  await drawn(stage, red, 0.5, ABOVE);
  await drawn(stage, red);
});
