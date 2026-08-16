# puppeteer-based-test
test UI for nginx/http web applications

 UI Availability Tests (Puppeteer)

Smoke / availability tests that verify the UI of your **nginx** and **HTTP web
applications** is actually reachable and rendering — not just returning a socket
connection. Each target is loaded in a real headless Chromium instance, so you
catch problems a plain `curl` misses (blank JS bundles, broken assets, console
errors, slow first paint, auth walls, etc.).

## What it checks per target
- ✅ Page is reachable (no navigation/DNS/TLS error)
- ✅ Correct top-level HTTP status (e.g. `200`)
- ✅ Loads within a configurable time budget
- ✅ A key UI element renders (CSS selector visible)
- ✅ Expected `<title>` / body text is present (optional)
- ✅ No critical browser **console errors**
- 🔎 Captures failed network requests for debugging

## Project layout
```
ui-availability-tests/
├── targets.config.js        # ← EDIT THIS: your list of apps/URLs
├── lib/probe.js             # reusable Puppeteer probing logic
├── ui-availability.test.js  # Jest test suite  (npm test)
├── run.js                   # standalone runner (npm run check)
├── package.json
└── README.md
```

## Setup
```bash
cd ui-availability-tests
npm install            # installs puppeteer (downloads Chromium) + jest
```

## Configure your targets
Edit **`targets.config.js`** and list your apps. Example:
```js
{
  name: 'Web app – Login page renders',
  url: 'http://localhost:8080/login',
  expectStatus: 200,
  waitForSelector: 'form input[type="password"]',
  bodyIncludes: 'Sign in',
  maxLoadMs: 15000,
  // basicAuth: { username: 'user', password: 'pass' },
}
```

## Run
**As a Jest test suite** (great for CI, gives per-check assertions):
```bash
npm test
```

**As a standalone report** (prints a table, exits non-zero on any failure —
ideal for a post-deploy gate in Jenkins/cron):
```bash
npm run check                 # uses targets.config.js
node run.js https://a.com https://b.com   # ad-hoc URLs
```

Sample output:
```
=== UI Availability Report ===
┌─────────┬──────────────────────────┬────────┬──────────┬──────────┐
│ (index) │ Target                   │ Status │ Load(ms) │ Result   │
├─────────┼──────────────────────────┼────────┼──────────┼──────────┤
│ 0       │ 'Nginx default landing…' │ 200    │ 142      │ '✅ PASS' │
│ 1       │ 'Web app – Login page…'  │ 200    │ 1183     │ '✅ PASS' │
└─────────┴──────────────────────────┴────────┴──────────┴──────────┘
2/2 targets available.
```

## Notes for your environment
- `--no-sandbox` and `--disable-dev-shm-usage` are set so it runs cleanly inside
  Docker / CI containers (common for nginx-hosted apps).
- `--ignore-certificate-errors` lets you probe internal HTTPS hosts with
  self-signed certs; drop it if you want strict TLS validation.
- The exit code from `run.js` is `1` when any target fails — wire that into your
  Jenkins pipeline stage to fail a deploy automatically.

## CI example (Jenkins stage)
```groovy
stage('UI availability') {
  steps {
    dir('ui-availability-tests') {
      sh 'npm ci'
      sh 'node run.js'   // non-zero exit fails the build
    }
  }
}
```
