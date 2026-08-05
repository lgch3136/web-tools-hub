import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sitemap = await readFile(new URL('../src/sitemap.xml', import.meta.url), 'utf8');
const productionRoutes = [...sitemap.matchAll(/<loc>https:\/\/practicaltools\.xyz([^<]*)<\/loc>/g)].map(match => match[1] || '/');
assert.equal(productionRoutes.length, 39, 'unexpected sitemap route count');

function toLocalPath(route) {
  if (route === '/') return '/';
  if (route === '/guides' || route === '/guides/') return '/guides/index.html';
  return `${route}.html`;
}

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const profile of [
    { name: 'desktop', viewport: { width: 1366, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  ]) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile });
    for (const route of productionRoutes) {
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on('console', message => {
        if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
      });
      const response = await page.goto(`${baseUrl}${toLocalPath(route)}?site-crawl=1`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      assert.equal(response?.status(), 200, `${profile.name} ${route} did not return 200`);
      await page.waitForTimeout(120);
      const result = await page.evaluate(() => ({
        title: document.title.trim(),
        description: document.querySelector('meta[name="description"]')?.content.trim() || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        h1: [...document.querySelectorAll('h1')].filter(node => !node.closest('#previewDocument')).length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        directAds: document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]').length,
      }));
      assert.ok(result.title, `${profile.name} ${route} has no title`);
      assert.ok(result.description, `${profile.name} ${route} has no description`);
      assert.equal(result.h1, 1, `${profile.name} ${route} has ${result.h1} h1 elements`);
      assert.ok(result.canonical.startsWith('https://practicaltools.xyz/'), `${profile.name} ${route} has invalid canonical`);
      assert.ok(result.overflow <= 1, `${profile.name} ${route} overflows horizontally by ${result.overflow}px`);
      assert.equal(result.directAds, 0, `${profile.name} ${route} loads advertising before opt-in`);
      assert.deepEqual(runtimeErrors, [], `${profile.name} ${route} runtime errors:\n${runtimeErrors.join('\n')}`);
      await page.close();
    }
    await context.close();
  }
  console.log(`Site crawl passed: ${productionRoutes.length} routes at desktop and 390px mobile widths.`);
} finally {
  await browser.close();
}
