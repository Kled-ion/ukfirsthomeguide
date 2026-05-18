/**
 * ============================================================
 * BEACON PROJECT — Agent 6: Content Freshness Auditor
 * ============================================================
 * File:      scripts/agent-6-freshness.js
 * Purpose:   Monthly audit detecting stale year references,
 *            broken external links, and seasonal content
 *            opportunities. All findings verified twice.
 * Schedule:  Monthly 1st of month 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl, checkUrl } = require("./http");
const { verifyAll }          = require("./verify");
const { SITES, EXTERNAL_LINKS } = require("./config");

// Stale phrases — centralised not hardcoded in logic
const STALE = [
  { find:"Updated April 2025",  replace:"Updated May 2026",  severity:"AMBER" },
  { find:"updated april 2025",  replace:"Updated May 2026",  severity:"AMBER" },
  { find:"2025/26 Tax Year",    replace:"2026/27 Tax Year",   severity:"AMBER" },
  { find:"tax year 2025/26",    replace:"tax year 2026/27",   severity:"AMBER" },
  { find:"2025 Tax Year",       replace:"2026/27 Tax Year",   severity:"AMBER" },
];

// External links — using config sources where possible, plus legal/regulatory
function getSeasonalOps() {
  const m = new Date().getMonth() + 1;
  const ops = [];
  if (m === 3)        ops.push("Tax year-end: 'Maximise salary sacrifice before 5 April'");
  if (m === 4)        ops.push("New tax year: Update all 2026/27 labels and rates");
  if (m === 10)       ops.push("Autumn Budget: Monitor for stamp duty or pension changes");
  if (m === 11||m===12) ops.push("Year-end: Tax planning content for both sites");
  if (m === 1)        ops.push("New year: 'New year, new mortgage' content for FTB guide");
  return ops;
}

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 6: Content Freshness Auditor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  const rawFindings = [];

  // Check 1: Stale phrases on live pages
  console.log("── Scanning for stale content ──\n");
  for (const [, site] of Object.entries(SITES)) {
    for (const page of site.pages) {
      if (page.path.endsWith(".xml")) continue;
      const url = site.baseUrl + page.path;
      try {
        const res = await fetchUrl(url);
        if (res.status !== 200) continue;
        for (const s of STALE) {
          if (res.body.includes(s.find)) {
            rawFindings.push({ type:"forbidden_phrase", url, phrase:s.find, description:`${site.name}${page.path} — stale: "${s.find}" → should be "${s.replace}"`, severity:s.severity });
            console.log(`⚠️  Stale: ${site.name}${page.path} — "${s.find}"`);
          }
        }
        if (!rawFindings.some(f => f.url === url)) console.log(`✅ Fresh: ${site.name}${page.path}`);
      } catch { /* Skip unreachable pages */ }
    }
  }

  // Check 2: External links
  console.log("\n── Verifying external links ──\n");
  for (const link of EXTERNAL_LINKS) {
    const result = await checkUrl(link.url);
    if (!result.ok) {
      rawFindings.push({ type:"http_error", url:link.url, phrase:"", description:`Broken external link: ${link.name} (${link.url})`, severity:"RED" });
      console.log(`🔴 BROKEN: ${link.name}`);
    } else {
      console.log(`✅ Live: ${link.name}`);
    }
  }

  // Self-verification
  console.log(`\n── Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  console.log("── Seasonal opportunities this month ──\n");
  const seasonal = getSeasonalOps();
  seasonal.length > 0
    ? seasonal.forEach(s => console.log(`🟡 ${s}`))
    : console.log("No seasonal content opportunities this month");

  console.log("\n── Final report ──\n");
  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Red: ${red.length} | Amber: ${amber.length}`);
  if (red.length > 0)        { console.log("🔴 Issues confirmed"); process.exit(1); }
  else if (amber.length > 0) { console.log("🟠 Stale content confirmed — update this week"); process.exit(0); }
  else                       { console.log("✅ All content verified current"); process.exit(0); }
}

run().catch(err => { console.error("Agent 6 error:", err.message); process.exit(1); });
