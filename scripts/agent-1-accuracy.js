/**
 * ============================================================
 * BEACON PROJECT — Agent 1: Accuracy Watchdog
 * ============================================================
 * File:      scripts/agent-1-accuracy.js
 * Purpose:   Verifies HMRC rate accuracy daily. Every finding
 *            passes through a 3-pass verification loop before
 *            being reported. Transient errors dismissed.
 * Schedule:  Daily 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl }  = require("./http");
const { verifyAll } = require("./verify");
const { OFFICIAL_SOURCES } = require("./config");

const CHECKS = [
  { name: "Income Tax — Personal Allowance £12,570",  url: OFFICIAL_SOURCES.incomeTaxRates,    phrases: ["£12,570","Personal Allowance"], value: "£12,570",  severity: "RED"   },
  { name: "Income Tax — Basic Rate Limit £50,270",    url: OFFICIAL_SOURCES.incomeTaxRates,    phrases: ["£50,270","Basic rate"],         value: "£50,270",  severity: "RED"   },
  { name: "Income Tax — Additional Rate £125,140",    url: OFFICIAL_SOURCES.incomeTaxRates,    phrases: ["£125,140"],                     value: "£125,140", severity: "RED"   },
  { name: "NI — Primary Threshold £12,570",           url: OFFICIAL_SOURCES.nationalInsurance, phrases: ["£12,570"],                      value: "£12,570",  severity: "RED"   },
  { name: "SDLT — Standard nil-rate £125,000",        url: OFFICIAL_SOURCES.sdltRates,         phrases: ["£125,000"],                     value: "£125,000", severity: "RED"   },
  { name: "SDLT — FTB threshold £300,000",            url: OFFICIAL_SOURCES.sdltRates,         phrases: ["£300,000","first-time buyer"],   value: "£300,000", severity: "RED"   },
  { name: "SDLT — FTB max relief £500,000",           url: OFFICIAL_SOURCES.sdltRates,         phrases: ["£500,000"],                     value: "£500,000", severity: "RED"   },
  { name: "SDLT — Additional surcharge 5%",           url: OFFICIAL_SOURCES.sdltRates,         phrases: ["5%","additional"],              value: "5%",       severity: "RED"   },
  { name: "Student Loan — Plan 2 £27,295",            url: OFFICIAL_SOURCES.studentLoans,      phrases: ["£27,295"],                      value: "£27,295",  severity: "AMBER" },
];

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 1: Accuracy Watchdog");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  // PASS 1 — Initial scan
  console.log("── Pass 1: Initial scan ──\n");
  const cache = {};
  const rawFindings = [];

  for (const check of CHECKS) {
    if (!cache[check.url]) {
      try { cache[check.url] = (await fetchUrl(check.url)).body; }
      catch (err) {
        rawFindings.push({ type:"http_error", url:check.url, phrase:"", description:`${check.name} — source unreachable`, severity:check.severity });
        continue;
      }
    }
    const missing = check.phrases.filter(p => !cache[check.url].includes(p));
    if (missing.length > 0) {
      rawFindings.push({ type:"missing_phrase", url:check.url, phrase:missing[0], description:`${check.name} — "${missing.join('","')}" not found on HMRC`, severity:check.severity, action:`Verify ${check.value} at ${check.url}` });
      console.log(`⚠️  Flagged: ${check.name}`);
    } else {
      console.log(`✅ Clear: ${check.name} — ${check.value} confirmed on source`);
    }
  }

  // PASS 2 — Verify all findings independently before reporting
  console.log(`\n── Pass 2: Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  // PASS 3 — Classify and output
  console.log("── Pass 3: Final report ──\n");
  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}${f.action ? "\n   → " + f.action : ""}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Passed: ${CHECKS.length - confirmed.length}/${CHECKS.length} | Red: ${red.length} | Amber: ${amber.length}`);
  if (red.length > 0)   { console.log("🔴 Action required today"); process.exit(1); }
  else if (amber.length > 0) { console.log("🟠 Review this week"); process.exit(0); }
  else                  { console.log("✅ All accuracy checks verified clean"); process.exit(0); }
}

run().catch(err => { console.error("Agent 1 error:", err.message); process.exit(1); });
