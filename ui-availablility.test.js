/**
 * ui-availability.test.js
 * -----------------------
 * Jest + Puppeteer unit/integration tests that verify UI availability
 * for a list of nginx / HTTP web applications.
 *
 * Run:  npm test
 *
 * One `describe` block is generated per target, with granular assertions
 * (reachable, correct status, UI rendered, no console errors, fast enough).
 */

'use strict';

const puppeteer = require('puppeteer');
const targets = require('./targets.config');
const { probeTarget } = require('./lib/probe');

const LAUNCH_OPTS = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-certificate-errors', // allow self-signed certs on internal hosts
  ],
};

// Global test timeout (per test) — generous for slow first loads.
jest.setTimeout(45000);

let browser;

beforeAll(async () => {
  browser = await puppeteer.launch(LAUNCH_OPTS);
});
afterAll(async () => {
  if (browser) await browser.close();
});

describe.each(targets.map((t) => [t.name, t]))('UI availability: %s', (_name, target) => {
  let res;

  beforeAll(async () => {
    res = await probeTarget(browser, target);
    // Helpful context in CI logs when something fails.
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`\n[FAIL] ${target.name} (${target.url})`, JSON.stringify(res, null, 2));
    }
  });

  test('is reachable without a hard navigation error', () => {
    expect(res.error).toBeNull();
  });

  test(`responds with HTTP ${target.expectStatus ?? 200}`, () => {
    expect(res.status).toBe(target.expectStatus ?? 200);
  });

  test('loads within the allotted time budget', () => {
    expect(res.checks.loadTime).toBe(true);
  });

  // Conditional checks only assert when the target opted into them.
  (target.waitForSelector ? test : test.skip)('renders the expected UI element', () => {
    expect(res.checks.selector).toBe(true);
  });
 (target.titleIncludes ? test : test.skip)('has the expected page title', () => {
    expect(res.checks.title).toBe(true);
  });

  (target.bodyIncludes ? test : test.skip)('contains the expected body content', () => {
    expect(res.checks.body).toBe(true);
  });

  test('has no critical console errors', () => {
    expect(res.consoleErrors).toEqual([]);
  });
});
