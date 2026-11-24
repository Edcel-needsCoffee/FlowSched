// Start Vite, then run: node apps/web/e2e/landing-scroll.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('playwright');
const url = process.env.LANDING_TEST_URL || 'http://127.0.0.1:5173/';
const original = readFileSync(resolve(__dirname, '../src/pages/Landing/landing-reference.html'), 'utf8');
const geometry = () => Object.fromEntries(['header', '.hero-message', '.stage', '.page .dash', '.fx'].map(selector => {
  const bounds = document.querySelector(selector).getBoundingClientRect();
  return [selector, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }];
}));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 1280, height: 540 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      const iframe = page.frameLocator('[data-testid="landing-page"]');
      await iframe.locator('.reference-below').waitFor();
      await iframe.locator('body').evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(100);
      const current = await iframe.locator('body').evaluate(geometry);
      const baseline = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      await baseline.setContent(original);
      await baseline.evaluate(async () => { await document.fonts.ready; });
      const expected = await baseline.evaluate(geometry);
      for (const selector of Object.keys(current)) {
        for (const key of ['x', 'y', 'width', 'height']) {
          assert.ok(Math.abs(current[selector][key] - expected[selector][key]) < 1, `Original ${selector} ${key} changed at ${viewport.width}`);
        }
      }
      await baseline.close();
      await iframe.getByRole('button', { name: 'See what it does' }).click();
      assert.ok(await iframe.locator('body').evaluate(() => scrollY >= innerHeight - 2));
      assert.equal(await iframe.locator('.tour-dashboard').count(), 0);
      assert.equal(await iframe.locator('.ref-foundation-card').count(), 5);
      assert.equal(await iframe.locator('.ref-dashboard-angle .dash').count(), 1);
      const names = await iframe.locator('.reference-below section').evaluateAll(sections => sections.map(section => section.getAttribute('aria-labelledby')));
      assert.deepEqual(names, ['ref-problem-title', 'ref-platform-title', 'ref-capabilities-title', 'ref-foundation-title', 'ref-final-title']);
      for (const section of ['.ref-problem', '.ref-platform', '.ref-capabilities', '.ref-foundation', '.ref-final']) {
        await iframe.locator(section).evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
        assert.equal(await iframe.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow at ${viewport.width}`);
        assert.equal(await iframe.locator('.page .dash').evaluate(element => getComputedStyle(element).visibility), 'visible');
      }
      await iframe.getByRole('button', { name: 'Back to top' }).click();
      assert.equal(await iframe.locator('body').evaluate(() => scrollY), 0);
      await iframe.locator('.ref-final-login').click();
      await page.getByRole('dialog').waitFor();
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Passed reference sections and unchanged hero: ${viewport.width} x ${viewport.height}`);
    }
    const animated = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await animated.goto(url);
    const frame = animated.frameLocator('[data-testid="landing-page"]');
    await frame.locator('.reference-below').waitFor();
    await frame.getByRole('button', { name: 'See what it does' }).click();
    await animated.waitForTimeout(1800);
    assert.equal(await frame.locator('.ref-problem').evaluate(element => getComputedStyle(element).opacity), '1');
    await frame.locator('.ref-platform').evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
    await animated.waitForTimeout(2000);
    assert.equal(await frame.locator('.ref-connections path').evaluate(element => getComputedStyle(element).strokeDashoffset), '0px');
    console.log('Passed animated reveal and connected-line drawing');
    await animated.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
