import { expect, test } from '../e2e';

test('will list the page source below it, without its spec', async ({ open, page }) => {
  await open('essentials/spin');

  const source = page.getByRole('region', { name: 'Source' });

  await expect(source.locator('figcaption')).toHaveText(['App.tsx']);
  await expect(source.locator('code')).toContainText('export default');
});
