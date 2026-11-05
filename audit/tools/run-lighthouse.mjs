// Deps (install in a scratch dir, not in the repo): npm i lighthouse@13.6.0 chrome-launcher puppeteer-core
// Env: CHROME_PATH=<chromium binary>. Both prod servers must be running (next build && next start).
// Usage: node run-lighthouse.mjs <outDir> [filter]
// Runs Lighthouse (3 runs, keeps the median-Performance run) against the PRODUCTION servers
// (website :3000, backoffice :3001) in mobile + desktop and saves JSON, HTML and a PNG of the report.
import fs from 'node:fs';
import path from 'node:path';
import lighthouse, { desktopConfig } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH;
const outDir = path.resolve(process.argv[2] ?? 'out');
const filter = process.argv[3];
const RUNS = Number(process.env.RUNS ?? 3);
fs.mkdirSync(outDir, { recursive: true });

// The backoffice guard only checks that the JWT has a future `exp` (signature is verified by the API),
// so a seeded token is enough to render the protected dashboard shell.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAKE_JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'audit', exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`;

const TARGETS = [
  { app: 'website', name: 'home', url: 'http://localhost:3000/' },
  { app: 'website', name: 'new-candidate', url: 'http://localhost:3000/candidates/new' },
  { app: 'backoffice', name: 'dashboard', url: 'http://localhost:3001/', token: true },
  { app: 'backoffice', name: 'incident-form', url: 'http://localhost:3001/incidents/new', token: true },
  { app: 'backoffice', name: 'login', url: 'http://localhost:3001/login' },
];

const chrome = await chromeLauncher.launch({
  chromePath: CHROME,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });

const summary = [];
for (const t of TARGETS) {
  if (filter && !`${t.app}-${t.name}`.includes(filter)) continue;
  // Seed the session for protected pages, and make sure public pages (login) start signed out.
  if (new URL(t.url).port === '3001') {
    const page = await browser.newPage();
    await page.goto(new URL(t.url).origin + '/login', { waitUntil: 'load' });
    await page.evaluate(
      (jwt) => (jwt ? localStorage.setItem('nexova.accessToken', jwt) : localStorage.clear()),
      t.token ? FAKE_JWT : null,
    );
    await page.close();
  }
  for (const mode of ['mobile', 'desktop']) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await lighthouse(
        t.url,
        {
          port: chrome.port,
          output: ['json', 'html'],
          logLevel: 'error',
          disableStorageReset: true,
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        mode === 'desktop' ? desktopConfig : undefined,
      );
      runs.push(r);
    }
    runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
    const med = runs[Math.floor(runs.length / 2)];
    const lhr = med.lhr;
    const base = `${t.app}-${t.name}-${mode}`;
    fs.writeFileSync(path.join(outDir, `${base}.json`), med.report[0]);
    fs.writeFileSync(path.join(outDir, `${base}.html`), med.report[1]);
    const a = lhr.audits;
    const row = {
      page: `${t.app}/${t.name}`,
      mode,
      perf: Math.round(lhr.categories.performance.score * 100),
      a11y: Math.round(lhr.categories.accessibility.score * 100),
      bp: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      fcp: a['first-contentful-paint'].displayValue,
      lcp: a['largest-contentful-paint'].displayValue,
      tbt: a['total-blocking-time'].displayValue,
      cls: a['cumulative-layout-shift'].displayValue,
      si: a['speed-index'].displayValue,
      ttfb: a['server-response-time'].displayValue,
      perfRuns: runs.map((r) => Math.round(r.lhr.categories.performance.score * 100)),
    };
    summary.push(row);
    console.log(JSON.stringify(row));

    const shot = await browser.newPage();
    await shot.setViewport({ width: 1100, height: 1000, deviceScaleFactor: 1 });
    await shot.goto('file://' + path.join(outDir, `${base}.html`), { waitUntil: 'load' });
    await shot.screenshot({ path: path.join(outDir, `${base}.png`) });
    await shot.close();
    fs.unlinkSync(path.join(outDir, `${base}.html`)); // the JSON + PNG are the committed evidence
  }
}
fs.writeFileSync(path.join(outDir, `summary${filter ? '-' + filter : ''}.json`), JSON.stringify(summary, null, 2));
await browser.disconnect();
await chrome.kill();
