'use strict';
// Optional real-browser smoke check. Runs in an isolated, temporary profile.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'release-assets', 'screenshots');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.clock.install();
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');
    await page.clock.runFor(150);
    const canvas = page.locator('#game');
    const box = await canvas.boundingBox();
    assert.equal(box.width, 390);
    const logical = (x, y) => ({ x: box.x + x, y: box.y + (box.height - 720) / 2 + y });
    async function click(x, y) { const p = logical(x, y); await page.touchscreen.tap(p.x, p.y); await page.clock.runFor(32); }
    await canvas.screenshot({ path: path.join(output, '01-menu.png') });
    await click(195, 584);
    await page.clock.runFor(3500);
    await canvas.screenshot({ path: path.join(output, '02-playing.png') });
    await click(343, 48);
    await canvas.screenshot({ path: path.join(output, '03-paused.png') });
    await click(195, 364);
    await page.clock.runFor(61000);
    await canvas.screenshot({ path: path.join(output, '04-result.png') });
    await click(195, 480);
    await page.clock.runFor(120);
    await click(343, 48);
    await click(195, 429);
    await canvas.screenshot({ path: path.join(output, '05-home-after-round.png') });
    await page.reload();
    await page.clock.runFor(80);
    await canvas.screenshot({ path: path.join(output, '06-reopened.png') });
    await context.close();
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    desktop.on('pageerror', e => errors.push(e.message));
    await desktop.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');
    await desktop.screenshot({ path: path.join(output, '07-desktop.png') });
    await desktop.keyboard.press('Space');
    await desktop.keyboard.down('ArrowRight');
    await desktop.keyboard.up('ArrowRight');
    await desktop.keyboard.press('p');
    await desktop.keyboard.press('Enter');
    await desktop.close();
    assert.deepEqual(errors, [], 'Browser must have no runtime or resource errors');
    console.log('PASS: real Chromium mobile round, pause/resume, restart/home/reopen, desktop keyboard; no browser errors.');
    console.log('Screenshots: ' + output);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
