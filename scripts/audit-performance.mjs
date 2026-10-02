import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { createAuditServer } from './serve-audit.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve('node_modules/.cache/playwright');
const { chromium } = await import('playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const label = process.argv[3] ?? 'local';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Use a simple report label.');
const directory = path.resolve('artifacts/pagespeed');
await mkdir(directory, { recursive: true });
const server = process.argv[2] ? undefined : await createAuditServer();
const browser = await chromium.launch({ args: ['--remote-debugging-port=9222'] });
let passed = true;

try {
  for (const device of ['mobile', 'desktop']) {
    const result = await lighthouse(url, {
      port: 9222,
      logLevel: 'error',
      output: ['html', 'json'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'agentic-browsing'],
    }, device === 'desktop' ? desktopConfig : undefined);
    if (!result || result.lhr.runtimeError) throw new Error(result?.lhr.runtimeError?.message ?? 'Lighthouse returned no report.');
    const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([id, category]) => [id, Math.round(category.score * 100)]));
    const failures = Object.values(result.lhr.audits).filter(audit => audit.score !== null && audit.score < 1).map(({ id, title, displayValue, details }) => ({ id, title, displayValue, items: details?.items }));
    for (const [index, extension] of ['html', 'json'].entries()) {
      await writeFile(path.join(directory, `${label}-${device}.${extension}`), result.report[index]);
    }
    const summary = { url, device, lighthouseVersion: result.lhr.lighthouseVersion, scores,
      metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map(id => [id, result.lhr.audits[id].displayValue])),
      warnings: result.lhr.runWarnings, failures };
    await writeFile(path.join(directory, `${label}-${device}-summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ device, scores, metrics: summary.metrics, failures: failures.map(({ id, title, displayValue }) => ({ id, title, displayValue })) }, null, 2));
    if (Object.values(scores).some(score => score < 90)) passed = false;
  }
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
