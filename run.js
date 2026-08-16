#!/usr/bin/env node
/**
 * run.js
 * ------
 * Standalone availability runner — no test framework required.
 * Prints a table of results and exits with code 1 if ANY target fails,
 * which makes it CI/CD- and cron-friendly (e.g. Jenkins post-deploy gate).
 *
 * Usage:
 *   node run.js                      # uses targets.config.js
 *   node run.js https://a.com https://b.com   # ad-hoc URLs
 */

'use strict';

const puppeteer = require('puppeteer');
const configTargets = require('./targets.config');
const { probeTarget } = require('./lib/probe');

const LAUNCH_OPTS = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-certificate-errors',
  ],
};

function buildTargets() {
  const cliUrls = process.argv.slice(2);
  if (cliUrls.length) {
    return cliUrls.map((url) => ({ name: url, url, expectStatus: 200 }));
  }
  return configTargets;
}
(async () => {
  const targets = buildTargets();
  const browser = await puppeteer.launch(LAUNCH_OPTS);
  const results = [];

  try {
    // Probe sequentially to keep resource usage predictable.
    for (const target of targets) {
      process.stdout.write(`Probing ${target.name} ... `);
      const res = await probeTarget(browser, target);
      results.push(res);
      console.log(res.ok ? 'PASS' : 'FAIL');
    }
  } finally {
    await browser.close();
  }

  // ---- Summary table ----
  console.log('\n=== UI Availability Report ===');
  const rows = results.map((r) => ({
    Target: r.name.slice(0, 32),
    Status: r.status ?? '—',
    'Load(ms)': r.loadMs ?? '—',
    Result: r.ok ? '✅ PASS' : '❌ FAIL',
    Notes: r.error
      ? r.error.slice(0, 40)
      : r.consoleErrors.length
      ? `${r.consoleErrors.length} console err`
      : '',
  }));
  console.table(rows);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} targets available.`);
if (failed.length) {
    console.log('\nFailures detail:');
    failed.forEach((f) => {
      console.log(`\n• ${f.name} (${f.url})`);
      if (f.error) console.log(`   error: ${f.error}`);
      Object.entries(f.checks).forEach(([k, v]) => {
        if (!v) console.log(`   check failed: ${k}`);
      });
      f.failedRequests.slice(0, 5).forEach((req) => console.log(`   net: ${req}`));
    });
    process.exitCode = 1; // signal failure to CI
  }
})().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
