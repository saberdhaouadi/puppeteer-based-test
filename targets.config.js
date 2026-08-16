/**
 * targets.config.js
 * -----------------
 * Central list of the web applications / nginx endpoints to probe.
 * Add or remove entries here — the test suite iterates over this array.
 *
 * Each target supports:
 *   name           (string)  Human-friendly label shown in test output.
 *   url            (string)  Full URL to load (http or https).
 *   expectStatus   (number)  Expected top-level HTTP status (default 200).
 *   waitForSelector(string)  Optional CSS selector that must be present/visible
 *                            to consider the UI "available".
 *   titleIncludes  (string)  Optional substring expected in <title>.
 *   bodyIncludes   (string)  Optional text expected somewhere in the DOM.
 *   maxLoadMs      (number)  Max acceptable full-load time (ms). Default 15000.
 *   basicAuth      (object)  Optional { username, password } for protected apps.
 */

module.exports = [
  {
    name: 'Nginx default landing page',
    url: 'http://localhost/',
    expectStatus: 200,
    bodyIncludes: 'Welcome to nginx',
    maxLoadMs: 8000,
  },
  {
    name: 'Nginx health endpoint',
    url: 'http://localhost/health',
    expectStatus: 200,
    bodyIncludes: 'ok',
    maxLoadMs: 5000,
  },
  {
    name: 'Web app – Home UI',
    url: 'http://localhost:8080/',
    expectStatus: 200,
	  waitForSelector: '#app, #root, main',
    titleIncludes: '',
    maxLoadMs: 15000,
  },
  {
    name: 'Web app – Login page renders',
    url: 'http://localhost:8080/login',
    expectStatus: 200,
    waitForSelector: 'form input[type="password"]',
    maxLoadMs: 15000,
  },
  // Example of an HTTPS app with basic auth:
  // {
  //   name: 'Internal dashboard',
  //   url: 'https://dashboard.internal.example.com/',
  //   expectStatus: 200,
  //   waitForSelector: '.dashboard-container',
  //   basicAuth: { username: 'user', password: 'pass' },
  //   maxLoadMs: 20000,
  // },
];
