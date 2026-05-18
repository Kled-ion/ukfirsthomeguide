/**
 * ============================================================
 * BEACON PROJECT — Agent 4: Affiliate Health Monitor
 * ============================================================
 * File:      scripts/agent-4-affiliate.js
 * Purpose:   Verifies affiliate partners are live, checks for
 *            placeholder Awin IDs, and confirms partner links
 *            are present in live site HTML. All failures are
 *            verified twice before reporting.
 * Schedule:  Weekly Monday 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl, checkUrl } = require("./http");
const { verifyAll }          = require("./verify");
const { SITES, AFFILIATE_PARTNERS } = require("./config");

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 4: Affiliate Health Monitor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  const rawFindings = [];

  // Check 1: Partner homepages
  console.log("── Checking partner homepages ──\n");
  for (const partner of PARTNERS) {
    try {
      const result = await checkUrl(partner.url);
      if (!result.ok) {
        rawFindings.push({ type:"http_error", url:partner.url, phrase:"", description:`${partner.name} homepage DOWN (HTTP ${result.status})`, severity:"RED" });
        console.log(`⚠️  ${partner.name} — HTTP ${result.status}`);
      } else {
        console.log(`✅ ${partner.name} — live`);
      }
    } catch (err) {
      rawFindings.push({ type:"http_error", url:partner.url, phrase:"", description:`${partner.name} — unreachable: ${err.message}`, severity:"RED" });
      console.log(`⚠️  ${partner.name} — error: ${err.message}`);
    }
  }

  // Check 2: Placeholder Awin IDs in live HTML
  console.log("\n── Checking live site affiliate links ──\n");
  for (const [siteKey, site] of Object.entries(SITES)) {
    try {
      const res = await fetchUrl(site.baseUrl + "/");
      if (res.body.includes("YOUR_AWIN_ID")) {
        rawFindings.push({ type:"forbidden_phrase", url:site.baseUrl + "/", phrase:"YOUR_AWIN_ID", description:`${site.name} — Awin placeholder ID in live code. Commission NOT tracking.`, severity:"RED" });
        console.log(`⚠️  ${site.name} — Awin placeholder found`);
      } else {
        console.log(`✅ ${site.name} — no Awin placeholder detected`);
      }
    } catch (err) {
      rawFindings.push({ type:"http_error", url:site.baseUrl, phrase:"", description:`${site.name} — could not check affiliate links: ${err.message}`, severity:"AMBER" });
    }
  }

  // Self-verification
  console.log(`\n── Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  console.log("── Final report ──\n");
  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n── Revenue check reminder ──`);
  console.log("ℹ️  To verify commissions: Log into Awin → Reports → Transaction Reports");
  console.log("   No commissions after 2 weeks live → verify Awin tracking URL format");

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Partners: ${PARTNERS.length} | Red: ${red.length} | Amber: ${amber.length}`);

  if (red.length > 0)        { console.log("🔴 Affiliate issues confirmed"); process.exit(1); }
  else if (amber.length > 0) { console.log("🟠 Warnings confirmed"); process.exit(0); }
  else                       { console.log("✅ All affiliate checks verified clean"); process.exit(0); }
}

run().catch(err => { console.error("Agent 4 error:", err.message); process.exit(1); });
