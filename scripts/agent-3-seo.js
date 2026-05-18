/**
 * ============================================================
 * BEACON PROJECT — Agent 3: SEO Monitor
 * ============================================================
 * File:      scripts/agent-3-seo.js
 * Purpose:   Checks on-page SEO signals for both sites.
 *            All failures verified twice before reporting.
 * Schedule:  Weekly Monday 8am UTC
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */
"use strict";
const { fetchUrl }  = require("./http");
const { verifyAll } = require("./verify");
const { SITES }     = require("./config");

// Extract key SEO signals from HTML
function extract(html) {
  return {
    title:       (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "",
    description: (html.match(/name="description"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+name="description"/i) || [])[1] || "",
    canonical:   (html.match(/rel="canonical"\s+href="([^"]+)"/i) || [])[1] || "",
    h1:          (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() || "",
    schemaTypes: (html.match(/"@type":\s*"([^"]+)"/g) || []).map(m => m.replace(/"@type":\s*"/, "").replace(/"$/, "")),
  };
}

const PAGE_CHECKS = [
  { siteKey:"smartSacrifice", path:"/",                             title:"Salary Sacrifice Calculator", desc:"salary sacrifice", canonical:"smartsacrifice.co.uk",  schema:"WebApplication" },
  { siteKey:"ukFirstHomeGuide", path:"/",                          title:"First Home Guide",             desc:"first",           canonical:"ukfirsthomeguide.co.uk", schema:"WebSite"         },
  { siteKey:"ukFirstHomeGuide", path:"/stamp-duty-calculator.html", title:"Stamp Duty Calculator 2026",  desc:"stamp duty",      canonical:"ukfirsthomeguide.co.uk", schema:"FAQPage"         },
];

async function run() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("BEACON — Agent 3: SEO Monitor");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════\n");

  const rawFindings = [];

  for (const check of PAGE_CHECKS) {
    const site = SITES[check.siteKey];
    const url  = site.baseUrl + check.path;
    console.log(`\n── SEO check: ${site.name}${check.path} ──`);

    let html;
    try {
      const res = await fetchUrl(url);
      html = res.body;
    } catch (err) {
      rawFindings.push({ type:"http_error", url, phrase:"", description:`Cannot fetch for SEO check: ${err.message}`, severity:"RED" });
      continue;
    }

    const s = extract(html);

    // Title
    if (!s.title.toLowerCase().includes(check.title.toLowerCase())) {
      rawFindings.push({ type:"missing_phrase", url, phrase:check.title, description:`${site.name}${check.path} — title missing "${check.title}" (found: "${s.title}")`, severity:"RED" });
      console.log(`⚠️  Title issue`);
    } else { console.log(`✅ Title: "${s.title}"`); }

    // Meta description
    if (!s.description.toLowerCase().includes(check.desc.toLowerCase())) {
      rawFindings.push({ type:"seo_missing", url, phrase:check.desc, description:`${site.name}${check.path} — meta description missing "${check.desc}"`, severity:"AMBER" });
      console.log(`⚠️  Description missing "${check.desc}"`);
    } else { console.log(`✅ Description present`); }

    // Canonical
    if (!s.canonical.includes(check.canonical)) {
      rawFindings.push({ type:"missing_phrase", url, phrase:check.canonical, description:`${site.name}${check.path} — canonical points to wrong domain: "${s.canonical}"`, severity:"RED" });
      console.log(`⚠️  Wrong canonical: ${s.canonical}`);
    } else { console.log(`✅ Canonical: ${s.canonical}`); }

    // Schema
    if (!s.schemaTypes.includes(check.schema)) {
      rawFindings.push({ type:"seo_missing", url, phrase:check.schema, description:`${site.name}${check.path} — schema type "${check.schema}" missing`, severity:"AMBER" });
      console.log(`⚠️  Schema "${check.schema}" not found`);
    } else { console.log(`✅ Schema: ${check.schema}`); }
  }

  // Verify all findings
  console.log(`\n── Self-verification (${rawFindings.length} finding(s)) ──`);
  const confirmed = await verifyAll(rawFindings, true);

  const red   = confirmed.filter(f => f.severity === "RED");
  const amber = confirmed.filter(f => f.severity === "AMBER");

  console.log("── Final report ──\n");
  red.forEach(f   => console.log(`🔴 RED   [${f.confidence}]: ${f.description}`));
  amber.forEach(f => console.log(`🟠 AMBER [${f.confidence}]: ${f.description}`));

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`Red: ${red.length} | Amber: ${amber.length}`);
  console.log("\nTarget keywords to monitor in Google Search Console:");
  Object.values(SITES).forEach(site => {
    console.log(`\n  ${site.name}:`);
    site.seoKeywords.forEach(kw => console.log(`  • "${kw}"`));
  });

  if (red.length > 0)        { console.log("\n🔴 SEO issues confirmed"); process.exit(1); }
  else if (amber.length > 0) { console.log("\n🟠 SEO warnings confirmed"); process.exit(0); }
  else                       { console.log("\n✅ All SEO checks verified clean"); process.exit(0); }
}

run().catch(err => { console.error("Agent 3 error:", err.message); process.exit(1); });
