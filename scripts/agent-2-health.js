/**
 * ============================================================
 * BEACON PROJECT — Agent 2: Site Health Monitor
 * ============================================================
 * File:      scripts/agent-2-health.js
 * Purpose:   Checks every page on both sites returns HTTP 200,
 *            contains required content, has no forbidden
 *            phrases, and passes legal compliance signals.
 *            All failures verified twice before reporting.
 * Schedule:  Daily 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl }  = require("./http");
const { verifyAll } = require("./verify");
const { SITES }     = require("./config");

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 2: Site Health Monitor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  const rawFindings = [];
  let   totalChecks = 0;

  for (const [siteKey, site] of Object.entries(SITES)) {
    console.log(`\n── ${site.name} (${site.domain}) ──`);

    for (const page of site.pages) {
      const url = site.baseUrl + page.path;
      totalChecks++;

      let res;
      try {
        res = await fetchUrl(url);
      } catch (err) {
        rawFindings.push({ type:"http_error", url, phrase:"", description:`${site.name}${page.path} — request failed: ${err.message}`, severity: page.critical ? "RED" : "AMBER" });
        console.log(`⚠️  Failed to reach: ${page.name}`);
        continue;
      }

      // Check 1: HTTP 200
      if (res.status !== 200) {
        rawFindings.push({ type:"http_error", url, phrase:"", description:`${site.name}${page.path} — HTTP ${res.status}`, severity: page.critical ? "RED" : "AMBER" });
        console.log(`⚠️  HTTP ${res.status}: ${page.name}`);
        continue; // No point checking content if page is down
      }

      // Check 2: Required phrases (homepage only)
      if (page.path === "/" && site.requiredPhrases) {
        for (const phrase of site.requiredPhrases) {
          if (!res.body.includes(phrase)) {
            rawFindings.push({ type:"missing_phrase", url, phrase, description:`${site.name}/ — required phrase missing: "${phrase}"`, severity:"RED" });
            console.log(`⚠️  Missing phrase on homepage: "${phrase}"`);
          }
        }
      }

      // Check 3: Forbidden phrases (all pages)
      if (site.forbiddenPhrases) {
        for (const phrase of site.forbiddenPhrases) {
          if (res.body.includes(phrase)) {
            rawFindings.push({ type:"forbidden_phrase", url, phrase, description:`${site.name}${page.path} — forbidden phrase found: "${phrase}"`, severity:"RED" });
            console.log(`⚠️  Forbidden phrase on ${page.name}: "${phrase}"`);
          }
        }
      }

      // Check 4: SSL
      if (res.url && res.url.startsWith("http://")) {
        rawFindings.push({ type:"missing_phrase", url, phrase:"https", description:`${site.name}${page.path} — serving over HTTP not HTTPS`, severity:"RED" });
      }

      if (!rawFindings.some(f => f.url === url)) {
        console.log(`✅ ${page.name} — HTTP 200, content verified`);
      }
    }
  }

  // PASS 2 — Verify all findings
  console.log(`\n── Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  // PASS 3 — Report
  console.log("── Final report ──\n");
  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Checks: ${totalChecks} | Red: ${red.length} | Amber: ${amber.length}`);
  if (red.length > 0)        { console.log("🔴 Critical issues confirmed"); process.exit(1); }
  else if (amber.length > 0) { console.log("🟠 Warnings confirmed — review this week"); process.exit(0); }
  else                       { console.log("✅ All health checks verified clean"); process.exit(0); }
}

run().catch(err => { console.error("Agent 2 error:", err.message); process.exit(1); });
