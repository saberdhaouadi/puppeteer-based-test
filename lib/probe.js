/**
 * lib/probe.js
 * ------------
 * Reusable Puppeteer probing logic shared by both the Jest suite
 * (ui-availability.test.js) and the standalone runner (run.js).
 *
 * A single `probeTarget(browser, target)` call:
 *   1. Opens a fresh page (isolated context — no shared cookies/cache).
 *   2. Navigates to the URL and captures the real HTTP status code.
 *   3. Verifies status / title / body / selector expectations.
 *   4. Measures load time and captures console + network errors.
 *   5. Returns a structured result object (never throws for app failures).
 */

'use strict';

const DEFAULT_MAX_LOAD_MS = 15000;

/**
 * Probe a single target and return a structured result.
 * @param {import('puppeteer').Browser} browser
 * @param {object} target
 * @returns {Promise<object>} result
 */
async function probeTarget(browser, target) {
  const {
    name,
    url,
    expectStatus = 200,
    waitForSelector,
    titleIncludes,
    bodyIncludes,
    maxLoadMs = DEFAULT_MAX_LOAD_MS,
    basicAuth,
  } = target;
	const result = {
    name,
    url,
    ok: false,
    status: null,
    expectStatus,
    loadMs: null,
    checks: {},
    consoleErrors: [],
    failedRequests: [],
    error: null,
  };

  // Use an isolated incognito-style context so targets don't share state.
  const context = browser.createBrowserContext
    ? await browser.createBrowserContext()
    : await browser.createIncognitoBrowserContext();

  let page;
  try {
    page = await context.newPage();

    if (basicAuth) {
      await page.authenticate(basicAuth);
    }

    // Collect diagnostics that explain *why* a UI looks broken.
    page.on('console', (msg) => {
      if (msg.type() === 'error') result.consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
      result.failedRequests.push(
        `${req.method()} ${req.url()} — ${req.failure()?.errorText || 'failed'}`
      );
    });
	   const started = Date.now();
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: maxLoadMs,
    });
    result.loadMs = Date.now() - started;

    // --- Status check ---
    result.status = response ? response.status() : null;
    result.checks.status = result.status === expectStatus;

    // --- Load-time check ---
    result.checks.loadTime = result.loadMs <= maxLoadMs;

    // --- Selector check (UI actually rendered) ---
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, {
          visible: true,
          timeout: Math.min(maxLoadMs, 10000),
        });
        result.checks.selector = true;
      } catch {
        result.checks.selector = false;
      }
    }

    // --- Title check ---
    if (titleIncludes) {
      const title = await page.title();
      result.title = title;
      result.checks.title = title.includes(titleIncludes);
    }
// --- Body text check ---
    if (bodyIncludes) {
      const bodyText = await page.evaluate(() => document.body?.innerText || '');
      result.checks.body = bodyText.includes(bodyIncludes);
    }

    // Overall pass = every executed check passed.
    result.ok = Object.values(result.checks).every(Boolean);
  } catch (err) {
    result.error = err.message;
    result.ok = false;
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  return result;
}

module.exports = { probeTarget, DEFAULT_MAX_LOAD_MS };
