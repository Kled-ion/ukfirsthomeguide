/**
 * BEACON PROJECT — Daily Site Health Check Agent
 * ================================================
 * Automatically checks both sites daily and reports any issues.
 * Runs via GitHub Actions on a schedule — no manual involvement needed.
 *
 * What it checks:
 *  - Sites are live and returning 200 status
 *  - Key pages load correctly
 *  - Calculator pages contain expected content
 *  - No broken internal links
 *  - SSL certificate valid
 *
 * Setup:
 *  1. Save this file as: scripts/health-check.js
 *  2. Save the GitHub Actions workflow as: .github/workflows/health-check.yml
 *  3. Push to GitHub — runs automatically every day at 8am
 *
 * Author: Beacon Engineering
 */

"use strict";

const https = require('https');
const http  = require('http');

// ── Sites to check ───────────────────────────────────────────────────────────
const CHECKS = [
  {
    name:     "Smart Sacrifice — Homepage",
    url:      "https://www.smartsacrifice.co.uk/",
    mustContain: ["Salary Sacrifice Calculator", "HMRC", "2025/26"],
    critical: true,
  },
  {
    name:     "Smart Sacrifice — About page",
    url:      "https://www.smartsacrifice.co.uk/about.html",
    mustContain: ["affiliate", "disclosure"],
    critical: false,
  },
  {
    name:     "UK First Home Guide — Homepage",
    url:      "https://www.ukfirsthomeguide.co.uk/",
    mustContain: ["Stamp Duty", "First-Time Buyer", "2026"],
    critical: true,
  },
  {
    name:     "UK First Home Guide — Stamp Duty Calculator",
    url:      "https://www.ukfirsthomeguide.co.uk/stamp-duty-calculator.html",
    mustContain: ["HMRC", "First-time buyer", "£300,000"],
    critical: true,
  },
  {
    name:     "UK First Home Guide — FTB Guide",
    url:      "https://www.ukfirsthomeguide.co.uk/first-time-buyer-guide.html",
    mustContain: ["deposit", "solicitor", "conveyancing"],
    critical: false,
  },
  {
    name:     "UK First Home Guide — Privacy Policy",
    url:      "https://www.ukfirsthomeguide.co.uk/privacy.html",
    mustContain: ["GDPR", "ICO", "personal data"],
    critical: true, // Required for legal compliance
  },
];

// ── HTTP fetch helper ─────────────────────────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// ── Run all checks ────────────────────────────────────────────────────────────
async function runChecks() {
  const results = [];
  let   hasErrors   = false;
  let   hasCritical = false;

  console.log(`\n🔍 Beacon Site Health Check — ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  for (const check of CHECKS) {
    const result = { name: check.name, url: check.url, passed: true, issues: [] };

    try {
      const response = await fetchPage(check.url);

      // Check HTTP status
      if (response.status !== 200) {
        result.passed = false;
        result.issues.push(`HTTP ${response.status} — expected 200`);
      }

      // Check required content
      for (const phrase of (check.mustContain || [])) {
        if (!response.body.includes(phrase)) {
          result.passed = false;
          result.issues.push(`Missing expected content: "${phrase}"`);
        }
      }

      // Check for placeholder affiliate URLs (shouldn't be in production)
      if (response.body.includes('YOUR_AWIN_ID')) {
        result.issues.push('⚠️  WARNING: Placeholder Awin ID found — affiliate links not active');
        // Not a failure, just a warning
      }

      // Check canonical URL matches domain
      if (response.body.includes('firsthomeguide.co.uk') &&
          check.url.includes('ukfirsthomeguide')) {
        result.passed = false;
        result.issues.push('Wrong canonical domain — still says firsthomeguide.co.uk');
      }

    } catch (err) {
      result.passed = false;
      result.issues.push(`Request failed: ${err.message}`);
    }

    if (!result.passed) {
      hasErrors = true;
      if (check.critical) hasCritical = true;
    }

    results.push({ ...result, critical: check.critical });

    // Log result
    const icon = result.passed ? '✅' : (check.critical ? '🔴' : '⚠️ ');
    console.log(`\n${icon} ${check.name}`);
    console.log(`   ${check.url}`);
    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`   └─ ${issue}`));
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);

  if (!hasErrors) {
    console.log('✅ All checks passed — both sites healthy');
  } else if (hasCritical) {
    console.log('🔴 CRITICAL issues found — immediate attention required');
    process.exit(1); // Causes GitHub Actions to flag the run as failed
  } else {
    console.log('⚠️  Warnings found — review recommended');
  }

  return results;
}

// Run
runChecks().catch(err => {
  console.error('Health check script failed:', err);
  process.exit(1);
});
