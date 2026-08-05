import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true });

function collectRuntimeErrors(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
  return errors;
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await desktop.newPage();
  const desktopErrors = collectRuntimeErrors(page, 'desktop');

  await page.goto(`${baseUrl}/md-html.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#markdownSource').fill(`# 浏览器回归测试\n\n这是 **实时预览** 测试。\n\n\`\`\`mermaid\nflowchart LR\n  A[草稿] --> B[发布]\n\`\`\`\n\n$$E = mc^2$$\n\n<script>window.__smokeUnsafe = true</script>`);
  await page.waitForSelector('#previewDocument .studio-diagram svg', { timeout: 10000 });
  await page.waitForSelector('#previewDocument .katex', { timeout: 10000 });
  assert.equal(await page.evaluate(() => Boolean(window.__smokeUnsafe)), false, 'preview executed unsafe HTML');
  assert.equal(await page.locator('#previewDocument .enhancement-fallback').count(), 0, 'enhancement fallback remained');

  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#previewDocument .studio-diagram svg', { timeout: 10000 });
  assert.match(await page.locator('#markdownSource').inputValue(), /浏览器回归测试/, 'autosave did not survive reload');

  await page.getByRole('button', { name: '编辑', exact: true }).click();
  assert.equal(await page.locator('#previewPanel').evaluate(element => getComputedStyle(element).display), 'none');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  assert.equal(await page.locator('#editorPanel').evaluate(element => getComputedStyle(element).display), 'none');
  await page.getByRole('button', { name: '分栏', exact: true }).click();

  const docxModule = await import('docx');
  const sourceDocx = new docxModule.Document({
    sections: [{
      children: [
        new docxModule.Paragraph({ text: '自动化 DOCX 导入', heading: docxModule.HeadingLevel.HEADING_1 }),
        new docxModule.Paragraph({ children: [new docxModule.TextRun({ text: '加粗正文', bold: true })] }),
      ],
    }],
  });
  const sourceBuffer = await docxModule.Packer.toBuffer(sourceDocx);
  await page.locator('#documentImportInput').setInputFiles({
    name: 'browser-import.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: sourceBuffer,
  });
  await page.waitForFunction(() => document.querySelector('#markdownSource')?.value.includes('自动化 DOCX 导入'));
  assert.match(await page.locator('#markdownSource').inputValue(), /\*\*加粗正文\*\*/);

  await page.evaluate(() => {
    const originalCreate = URL.createObjectURL.bind(URL);
    const blobs = new Map();
    window.__smokeDownloads = [];
    URL.createObjectURL = blob => {
      const url = originalCreate(blob);
      blobs.set(url, blob);
      return url;
    };
    HTMLAnchorElement.prototype.click = function captureDownload() {
      const blob = blobs.get(this.href);
      window.__smokeDownloads.push({ filename: this.download, size: blob?.size || 0, type: blob?.type || '' });
    };
  });
  await page.locator('#exportMenu > summary').click();
  await page.locator('[data-export="docx"]').click();
  await page.waitForFunction(() => window.__smokeDownloads?.length === 1, null, { timeout: 15000 });
  const exportedDocx = await page.evaluate(() => window.__smokeDownloads[0]);
  assert.match(exportedDocx.filename, /自动化 DOCX 导入\.docx$/);
  assert.ok(exportedDocx.size > 1000, 'DOCX export was unexpectedly small');
  assert.equal(exportedDocx.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  await page.screenshot({ path: '/tmp/practicaltools-desktop.png', fullPage: false });
  assert.deepEqual(desktopErrors, [], `desktop runtime errors: ${desktopErrors.join('\n')}`);

  const consentPage = await desktop.newPage();
  await consentPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await consentPage.locator('#cookie-consent-banner.cc-visible').waitFor();
  const defaultConsent = await consentPage.evaluate(() => {
    const entry = (window.dataLayer || []).find(item => item?.[0] === 'consent' && item?.[1] === 'default');
    return entry ? { ...entry[2] } : null;
  });
  assert.equal(defaultConsent?.ad_storage, 'denied', 'advertising storage should default to denied');
  assert.equal(await consentPage.locator('script[data-ad-client-loaded]').count(), 0, 'advertising loaded before opt-in');
  await consentPage.locator('#cc-essential-btn').click();
  assert.equal(await consentPage.evaluate(() => localStorage.getItem('cookie_consent')), 'essential');
  assert.equal(await consentPage.locator('script[data-ad-client-loaded]').count(), 0, 'advertising loaded after essential-only choice');
  await consentPage.evaluate(() => localStorage.removeItem('cookie_consent'));
  await consentPage.reload({ waitUntil: 'domcontentloaded' });
  await consentPage.locator('#cookie-consent-banner.cc-visible').waitFor();
  await consentPage.locator('#cc-accept-btn').click();
  await consentPage.locator('script[data-ad-client-loaded]').waitFor({ state: 'attached' });
  assert.equal(await consentPage.evaluate(() => localStorage.getItem('cookie_consent')), 'accepted');
  await consentPage.close();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  const mobileErrors = collectRuntimeErrors(mobilePage, 'mobile');
  await mobilePage.goto(`${baseUrl}/md-html.html`, { waitUntil: 'domcontentloaded' });

  assert.notEqual(await mobilePage.locator('.studio-mobile-tabs').evaluate(element => getComputedStyle(element).display), 'none');
  assert.equal(await mobilePage.locator('#editorPanel').evaluate(element => getComputedStyle(element).display === 'none'), false);
  await mobilePage.locator('#mobilePreviewTab').tap();
  assert.equal(await mobilePage.locator('#editorPanel').evaluate(element => getComputedStyle(element).display), 'none');
  assert.notEqual(await mobilePage.locator('#previewPanel').evaluate(element => getComputedStyle(element).display), 'none');
  const overflow = await mobilePage.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(overflow.document <= overflow.viewport + 1, `mobile document overflowed: ${JSON.stringify(overflow)}`);
  assert.ok(overflow.body <= overflow.viewport + 1, `mobile body overflowed: ${JSON.stringify(overflow)}`);
  assert.equal(await mobilePage.locator('#cookie-consent-banner').count(), 0, 'ad cookie banner appeared on the ad-free Markdown tool');
  await mobilePage.screenshot({ path: '/tmp/practicaltools-mobile.png', fullPage: true });
  assert.deepEqual(mobileErrors, [], `mobile runtime errors: ${mobileErrors.join('\n')}`);
  await mobile.close();

  console.log('Browser smoke passed: desktop rendering, safety, autosave, DOCX import/export, view modes, and mobile tabs/overflow.');
} finally {
  await browser.close();
}
