/**
 * ============================================================
 * BEACON PROJECT — Weekly Digest
 * ============================================================
 * File:      scripts/weekly-digest.js
 * Purpose:   Runs all 7 agents sequentially every Monday and
 *            produces a single consolidated digest report.
 *            Designed to take under 5 minutes to read and act on.
 *
 * Design principle:
 *   You should never need to dig through individual agent logs.
 *   This digest is the only thing you read each week.
 *   If it takes more than 5 minutes, something is wrong with
 *   the reporting, not the sites.
 *
 * Run:       node scripts/weekly-digest.js
 * Schedule:  Weekly (Mondays) at 8am UTC via GitHub Actions
 * Output:    Formatted digest to console + exit code
 * Owner:     Kleds (Kled-ion on GitHub)
 * ============================================================
 */

"use strict";

const { execSync } = require("child_process");
const path         = require("path");

// ── Run a single agent and capture its output ─────────────────────────────
function runAgent(scriptPath) {
  try {
    const output = execSync(`node ${scriptPath}`, {
      encoding: "utf8",
      timeout:  60_000, // 60 second timeout per agent
    });
    return { success: true, output, exitCode: 0 };
  } catch (err) {
    return {
      success:  false,
      output:   err.stdout || "",
      error:    err.stderr || err.message,
      exitCode: err.status || 1,
    };
  }
}

// ── Extract key findings from agent output ─────────────────────────────────
function extractFindings(output) {
  const lines   = output.split("\n");
  const red     = lines.filter(l => l.includes("🔴")).map(l => l.trim());
  const amber   = lines.filter(l => l.includes("🟠")).map(l => l.trim());
  const passed  = lines.filter(l => l.includes("✅")).length;
  const summary = lines.find(l => l.includes("Summary:")) || "";
  return { red, amber, passed, summary };
}

// ── Format GBP ────────────────────────────────────────────────────────────
function fmtGBP(n) {
  return `£${(n || 0).toLocaleString("en-GB")}`;
}

async function runWeeklyDigest() {
  const startTime = Date.now();
  const today     = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const scripts = path.join(__dirname);

  // ── Run all agents ──────────────────────────────────────────────────────
  console.log("Running all agents...\n");

  const agents = [
    { id: 1, name: "Accuracy Watchdog",       file: "agent-1-accuracy.js",   schedule: "daily"   },
    { id: 2, name: "Site Health Monitor",     file: "agent-2-health.js",     schedule: "daily"   },
    { id: 3, name: "SEO Monitor",             file: "agent-3-seo.js",        schedule: "weekly"  },
    { id: 4, name: "Affiliate Health",        file: "agent-4-affiliate.js",  schedule: "weekly"  },
    { id: 5, name: "Competitor Monitor",      file: "agent-5-competitor.js", schedule: "weekly"  },
    { id: 6, name: "Content Freshness",       file: "agent-6-freshness.js",  schedule: "monthly" },
    { id: 7, name: "Legal Compliance",        file: "agent-7-legal.js",      schedule: "monthly" },
  ];

  const results = {};
  for (const agent of agents) {
    process.stdout.write(`  Agent ${agent.id} — ${agent.name}... `);
    results[agent.id] = runAgent(path.join(scripts, agent.file));
    console.log(results[agent.id].success ? "done" : "FAILED");
  }

  // ── Compile digest ──────────────────────────────────────────────────────
  const allRed   = [];
  const allAmber = [];
  let   totalPassed = 0;

  for (const agent of agents) {
    const { red, amber, passed } = extractFindings(results[agent.id].output);
    red.forEach(r   => allRed.push(`[Agent ${agent.id}: ${agent.name}] ${r}`));
    amber.forEach(a => allAmber.push(`[Agent ${agent.id}: ${agent.name}] ${a}`));
    totalPassed += passed;
  }

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);

  // ── Print digest ────────────────────────────────────────────────────────
  const divider = "═".repeat(52);

  console.log(`\n\n${divider}`);
  console.log(`BEACON WEEKLY DIGEST — ${today}`);
  console.log(divider);

  // Urgent items
  console.log("\n🔴 URGENT — Action required today:");
  if (allRed.length === 0) {
    console.log("   None — all critical checks passed ✅");
  } else {
    allRed.forEach(r => console.log(`   ${r}`));
  }

  // This week items
  console.log("\n🟠 THIS WEEK — Action before next digest:");
  if (allAmber.length === 0) {
    console.log("   None");
  } else {
    allAmber.forEach(a => console.log(`   ${a}`));
  }

  // Numbers
  console.log("\n📊 NUMBERS:");
  console.log("   smartsacrifice.co.uk:    [Check Plausible Analytics]");
  console.log("   ukfirsthomeguide.co.uk:  [Check Plausible Analytics]");
  console.log("   Awin commissions:        [Log into Awin dashboard]");
  console.log("   Checks passed:          ", totalPassed);

  // Agent status
  console.log("\n✅ ALL CLEAR — Agents that ran without issues:");
  agents.forEach(agent => {
    const result   = results[agent.id];
    const findings = extractFindings(result.output);
    const status   = !result.success
      ? "❌ FAILED TO RUN"
      : findings.red.length > 0
        ? "⚠️  Issues found"
        : "✅ All clear";
    console.log(`   Agent ${agent.id} (${agent.name}): ${status}`);
  });

  // Recommendations
  console.log("\n🟡 STANDING RECOMMENDATIONS:");
  console.log("   1. Set up Plausible Analytics on both sites (£9/mo)");
  console.log("   2. Connect Google Search Console for keyword ranking data");
  console.log("   3. Update Awin affiliate links once ID approved");
  console.log("   4. Consider adding salary sacrifice employer comparison page");

  // Time estimate
  const urgentMins = allRed.length > 0   ? allRed.length * 5   : 0;
  const amberMins  = allAmber.length > 0 ? allAmber.length * 10 : 0;
  const totalMins  = urgentMins + amberMins;

  console.log(`\n⏱️  ESTIMATED TIME REQUIRED FROM YOU: ${totalMins === 0 ? "0 minutes — nothing to do" : `${totalMins} minutes`}`);
  console.log(`   (Digest generated in ${elapsedSec}s)`);
  console.log(`\n${divider}\n`);

  // Exit with failure if any RED issues found
  process.exit(allRed.length > 0 ? 1 : 0);
}

runWeeklyDigest().catch(err => {
  console.error("Weekly digest failed:", err);
  process.exit(1);
});
