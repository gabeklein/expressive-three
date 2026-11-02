import { dark, drawn, expect, type Pixel, test } from '../../../e2e';

const white = ([r, g, b]: Pixel) => r > 120 && g > 120 && b > 120;
const blue = ([r, g, b]: Pixel) => b > 120 && r < 80 && g < 80;
const green = ([r, g, b]: Pixel) => g > 120 && r < 80 && b < 80;

test('will orbit the lamp, then hold it in front', async ({ page, open }) => {
  await open('look/lights');

  const stage = page.locator('canvas.stage');

  await drawn(stage, dark);

  await page.getByRole('button', { name: 'Hold in front' }).click();
  await expect(page.getByRole('button', { name: 'Orbit' })).toBeVisible();
  await drawn(stage, white);
  await drawn(stage, white, 0.5, 0.4);
});

test('will tint the ball when a colour is assigned, but not update the readout when set in place', async ({
  page,
  open
}) => {
  await open('look/lights');

  const stage = page.locator('canvas.stage');
  const color = page.locator('.color');

  await page.getByRole('button', { name: 'Hold in front' }).click();
  await expect(color).toHaveText('#ffffff');

  await page.getByRole('button', { name: 'blue', exact: true }).click();
  await drawn(stage, blue);
  await expect(color).toHaveText('#0000ff');

  await page.getByRole('button', { name: 'green, in place' }).click();
  await drawn(stage, green);
  await expect(color).toHaveText('#0000ff');
});

test('will darken the ball at zero intensity and when switched off', async ({ page, open }) => {
  await open('look/lights');

  const stage = page.locator('canvas.stage');
  const intensity = page.getByRole('slider');

  await page.getByRole('button', { name: 'Hold in front' }).click();
  await drawn(stage, white);
  await expect(page.locator('.intensity')).toHaveText('10');

  await intensity.fill('0');
  await expect(page.locator('.intensity')).toHaveText('0');
  await drawn(stage, dark);

  await intensity.fill('10');
  await drawn(stage, white);

  await page.getByRole('button', { name: 'Switch off' }).click();
  await expect(page.locator('.visible')).toHaveText('off');
  await drawn(stage, dark);

  await page.getByRole('button', { name: 'Switch on' }).click();
  await expect(page.locator('.visible')).toHaveText('on');
  await drawn(stage, white);
});
