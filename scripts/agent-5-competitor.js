/**
 * ============================================================
 * BEACON PROJECT — Agent 5: Competitor Monitor
 * ============================================================
 * File:      scripts/agent-5-competitor.js
 * Purpose:   Checks key competitor pages weekly for new tools,
 *            content gaps, and changes affecting our rankings.
 *            Uses self-verification — findings confirmed twice.
 *            Informational only — never fails the pipeline.
 * Schedule:  Weekly Monday 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl }    = require("./http");
const { verifyAll }   = require("./verify");
const { COMPETITORS, SITES } = require("./config");

const CHECKS = [
  { name:"MoneySavingExpert — Salary Sacrifice", url:COMPETITORS.moneySavingExpert.salaryPage, mustFind:["salary sacrifice","pension"],           flagIf:["2026/27"], purpose:"New calculator features or tax year updates" },
  { name:"MoneySavingExpert — First-Time Buyers", url:COMPETITORS.moneySavingExpert.ftbPage,  mustFind:["stamp duty","first-time buyer"],        flagIf:["£300,000"], purpose:"FTB content updates to match" },
  { name:"MoneySupermarket — Stamp Duty",         url:COMPETITORS.moneySupermarket.sdltPage,  mustFind:["stamp duty","calculator"],              flagIf:[], purpose:"UX and feature changes" },
  { name:"Which? — First-Time Buyers",            url:COMPETITORS.which.ftbPage,              mustFind:["first-time buyer","mortgage","deposit"], flagIf:[], purpose:"Content gaps we can fill" },
];

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 5: Competitor Monitor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");
  console.log("ℹ️  Informational only — does not fail the pipeline.\n");

  const rawFindings = [];
  const alerts      = [];
  const unreachable = [];

  // Pass 1: Initial scan
  console.log("── Pass 1: Initial scan ──\n");
  for (const check of CHECKS) {
    console.log(`── ${check.name} ──`);
    let html;
    try {
      const res = await fetchUrl(check.url);
      if (res.status !== 200) {
        unreachable.push(`${check.name} — HTTP ${res.status}`);
        console.log(`🔴 Unreachable: ${check.name}`);
        console.log(`⚠️  HTTP ${res.status}\n`);
        continue;
      }
      html = res.body.toLowerCase();
    } catch (err) {
      unreachable.push(`${check.name} — ${err.message}`);
      console.log(`⚠️  Unreachable\n`);
      continue;
    }

    const missing = check.mustFind.filter(p => !html.includes(p.toLowerCase()));
    if (missing.length > 0) {
      rawFindings.push({ type:"missing_phrase", url:check.url, phrase:missing[0], description:`${check.name}: page changed — "${missing.join('","')}" no longer found`, severity:"INFO" });
      console.log(`⚠️  Page may have changed — "${missing.join('","')}" not found`);
    } else {
      console.log(`✅ Page stable`);
    }

    const triggered = check.flagIf.filter(p => html.includes(p.toLowerCase()));
    if (triggered.length > 0) {
      alerts.push(`${check.name}: mentions "${triggered.join('","')}" — verify our content covers this`);
      console.log(`🟠 Alert: competitor mentions "${triggered.join('","')}"`);
    }
    console.log(`   Purpose: ${check.purpose}\n`);
  }

  // Pass 2: Verify findings
  console.log(`── Pass 2: Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  // Pass 3: Report
  console.log("── Pass 3: Content gap recommendations ──\n");
  [
    "Salary sacrifice vs personal pension comparison",
    "Stamp duty calculator for limited companies (niche, low competition)",
    "First-time buyer stamp duty changes April 2025 — explainer",
    "Shared ownership stamp duty calculator",
  ].forEach((r, i) => console.log(`🟡 ${i+1}. ${r}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Changes detected: ${confirmed.length} | Alerts: ${alerts.length} | Unreachable: ${unreachable.length}`);
  if (alerts.length > 0)     { console.log("\n🟠 Review:"); alerts.forEach(a => console.log(`  • ${a}`)); }
  if (unreachable.length > 0){ console.log("\n⚠️  Could not reach:"); unreachable.forEach(u => console.log(`  • ${u}`)); }
  if (confirmed.length === 0 && alerts.length === 0) console.log("\n✅ No competitor changes detected");
  process.exit(0);
}

run().catch(err => { console.error("Agent 5 error:", err.message); process.exit(0); });
