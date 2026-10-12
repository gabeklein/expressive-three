import { test as base, expect, type Locator } from '@playwright/test';
import { PNG } from 'pngjs';

export type Pixel = [number, number, number];

export const test = base.extend<{ open: (path: string) => Promise<void> }>({
  open: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() == 'error' && !message.text().startsWith('Failed to load resource'))
        errors.push(message.text());
    });

    await use(async (path) => {
      await page.goto(`?page=${path}`);
      await page.locator('#root > *').first().waitFor();
    });

    expect(errors, 'page errors and console.error').toEqual([]);
  }
});

/** Colour drawn at a point of `target`, from 0..1 across and down. */
export async function pixel(target: Locator, x = 0.5, y = 0.5): Promise<Pixel> {
  const png = PNG.sync.read(await target.screenshot());
  const at = (Math.round(y * (png.height - 1)) * png.width + Math.round(x * (png.width - 1))) * 4;

  return [png.data[at], png.data[at + 1], png.data[at + 2]];
}

/** How many pixels of `target` match `test` - for something drawn somewhere, not at a known point. */
export async function area(target: Locator, test: (pixel: Pixel) => boolean) {
  const { data } = PNG.sync.read(await target.screenshot());
  let count = 0;

  for (let at = 0; at < data.length; at += 4) if (test([data[at], data[at + 1], data[at + 2]])) count++;

  return count;
}

/** Wait until the colour at a point matches `test`. */
export async function drawn(target: Locator, test: (pixel: Pixel) => boolean, x?: number, y?: number) {
  await expect.poll(async () => test(await pixel(target, x, y)), { timeout: 10_000 }).toBe(true);
}

export const red = ([r, g, b]: Pixel) => r > 150 && g < 110 && b < 110;
export const green = ([r, g, b]: Pixel) => g > 150 && r < 110 && b < 110;
export const dark = ([r, g, b]: Pixel) => r < 50 && g < 50 && b < 50;

export { expect };
