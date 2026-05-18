/**
 * ============================================================
 * BEACON PROJECT — Agent 7: Legal Compliance Monitor
 * ============================================================
 * File:      scripts/agent-7-legal.js
 * Purpose:   Monthly check that both sites remain legally
 *            compliant: financial disclaimers, affiliate
 *            disclosures, privacy policies, and FCA perimeter.
 *            All failures verified twice before reporting.
 * Schedule:  Monthly 1st of month 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl }  = require("./http");
const { verifyAll } = require("./verify");
const { SITES }     = require("./config");

// All legal checks defined as data — easy to add new ones
const LEGAL_CHECKS = [
  // Financial advice disclaimers
  { name:"SS — Financial advice disclaimer",      url:`${SITES.smartSacrifice.baseUrl}/`,              phrases:["not constitute regulated financial advice","not FCA-authorised"], severity:"RED",   reason:"FCA perimeter" },
  { name:"SS — Capital at risk",                  url:`${SITES.smartSacrifice.baseUrl}/`,              phrases:["Capital at risk"],                                               severity:"RED",   reason:"FCA guidance for investment products" },
  { name:"FHG — Financial advice disclaimer",     url:`${SITES.ukFirstHomeGuide.baseUrl}/`,            phrases:["not constitute financial advice"],                               severity:"RED",   reason:"FCA perimeter" },
  // Affiliate disclosures
  { name:"SS — Affiliate disclosure",             url:`${SITES.smartSacrifice.baseUrl}/`,              phrases:["Sponsored","We may earn a commission"],                          severity:"RED",   reason:"UK Consumer Rights Act + Awin T&Cs" },
  { name:"FHG — Affiliate disclosure",            url:`${SITES.ukFirstHomeGuide.baseUrl}/`,            phrases:["Sponsored","We may earn a commission"],                          severity:"RED",   reason:"UK Consumer Rights Act + Awin T&Cs" },
  // Privacy policies
  { name:"SS — Privacy policy accessible",        url:`${SITES.smartSacrifice.baseUrl}/privacy.html`,  phrases:["UK GDPR","ICO","personal data"],                                 severity:"RED",   reason:"UK GDPR Article 13" },
  { name:"SS — Privacy policy linked",            url:`${SITES.smartSacrifice.baseUrl}/`,              phrases:["privacy.html","Privacy"],                                        severity:"RED",   reason:"Privacy policy must be accessible from every page" },
  { name:"FHG — Privacy policy accessible",       url:`${SITES.ukFirstHomeGuide.baseUrl}/privacy.html`,phrases:["UK GDPR","ICO","personal data"],                                 severity:"RED",   reason:"UK GDPR Article 13" },
  // About / disclosure pages
  { name:"SS — About page with disclosure",       url:`${SITES.smartSacrifice.baseUrl}/about.html`,    phrases:["affiliate","commission","not FCA-authorised"],                   severity:"RED",   reason:"Awin publisher requirements" },
  { name:"FHG — About page with disclosure",      url:`${SITES.ukFirstHomeGuide.baseUrl}/about.html`,  phrases:["affiliate","commission","not FCA-authorised"],                   severity:"RED",   reason:"Awin publisher requirements" },
  // Calculator disclaimer
  { name:"SS — Calculator estimate disclaimer",   url:`${SITES.smartSacrifice.baseUrl}/`,              phrases:["verify with your employer","Independent Financial"],             severity:"AMBER", reason:"Calculator outputs must be labelled as estimates" },
  { name:"FHG — SDLT estimate disclaimer",        url:`${SITES.ukFirstHomeGuide.baseUrl}/stamp-duty-calculator.html`, phrases:["estimates only","verify with HMRC"],            severity:"AMBER", reason:"Calculator outputs must be labelled as estimates" },
];

const MANUAL_CHECKS = [
  "ICO registration: Check ico.org.uk/for-organisations/register — required if processing personal data",
  "Awin T&Cs: Check publisher.awin.com → Resources → Publisher Terms for any updates",
  "FCA perimeter: Does any new content constitute advice? Check fca.org.uk/firms/authorisation",
  "ASA CAP: Are promotional claims (e.g. '90+ lenders') still accurate for our partners?",
];

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 7: Legal Compliance Monitor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  // Cache pages to avoid duplicate requests
  const cache = {};
  async function getPage(url) {
    if (!cache[url]) {
      try {
        const res = await fetchUrl(url);
        cache[url] = { ok: res.status === 200, body: res.body };
      } catch (err) {
        cache[url] = { ok: false, body: "", error: err.message };
      }
    }
    return cache[url];
  }

  const rawFindings = [];
  console.log("── Automated compliance checks ──\n");

  for (const check of LEGAL_CHECKS) {
    const page = await getPage(check.url);

    if (!page.ok) {
      rawFindings.push({ type:"http_error", url:check.url, phrase:"", description:`${check.name} — page not accessible`, severity:"RED" });
      console.log(`⚠️  Page down: ${check.name}`);
      continue;
    }

    const missing = check.phrases.filter(p => !page.body.toLowerCase().includes(p.toLowerCase()));
    if (missing.length > 0) {
      rawFindings.push({ type:"missing_phrase", url:check.url, phrase:missing[0], description:`${check.name} — missing: "${missing.join('","')}"`, severity:check.severity, action:`Required for: ${check.reason}` });
      console.log(`⚠️  ${check.name} — missing required text`);
    } else {
      console.log(`✅ ${check.name}`);
    }
  }

  // Self-verification
  console.log(`\n── Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  console.log("── Manual checks (do monthly) ──\n");
  MANUAL_CHECKS.forEach((c, i) => console.log(`${i+1}. ${c}`));

  console.log("\n── Final report ──\n");
  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}${f.action ? "\n   → " + f.action : ""}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Checks: ${LEGAL_CHECKS.length} | Red: ${red.length} | Amber: ${amber.length}`);
  if (red.length > 0)        { console.log("🔴 Legal compliance failures confirmed"); process.exit(1); }
  else if (amber.length > 0) { console.log("🟠 Compliance warnings — review this week"); process.exit(0); }
  else                       { console.log("✅ All legal compliance checks verified clean"); process.exit(0); }
}

run().catch(err => { console.error("Agent 7 error:", err.message); process.exit(1); });
