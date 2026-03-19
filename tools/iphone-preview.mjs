import { chromium, devices } from 'playwright';

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

const iPhone =
  devices['iPhone 14'] ||
  devices['iPhone 13'] ||
  devices['iPhone 12'];

if (!iPhone) {
  throw new Error('No iPhone device descriptor found in Playwright.');
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...iPhone,
});

const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });

console.log(`iPhone preview running: ${url}`);
console.log('Close the browser window to stop.');

// Keep process alive until window is closed.
await page.waitForEvent('close');
await context.close();
await browser.close();
