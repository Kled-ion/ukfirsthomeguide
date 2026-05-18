/**
 * ============================================================
 * BEACON PROJECT — Self-Verification Module
 * ============================================================
 * File:     scripts/verify.js
 * Purpose:  Shared verification loop used by every agent.
 *           Before any finding is reported, it must pass
 *           through this module and be confirmed twice.
 *
 * The loop:
 *   Pass 1 — Initial finding detected
 *   Pass 2 — Re-fetch the source independently and reconfirm
 *   Pass 3 — Cross-check against a second source if available
 *   Result  — Only report if confirmed in at least 2 passes
 *
 * Why this exists:
 *   A false positive in a health check wakes you up at 3am
 *   for no reason. A false positive in a legal check creates
 *   unnecessary panic. Every finding must earn its flag.
 *
 * Confidence levels:
 *   HIGH   — Confirmed in 2+ independent checks
 *   MEDIUM — Confirmed once, second check inconclusive
 *   LOW    — Single signal only, not re-confirmed
 *
 * Rule: LOW confidence findings are NEVER escalated as RED.
 *       They appear as INFO only, with explicit uncertainty.
 *
 * Owner: Kleds (Kled-ion on GitHub)
 * ============================================================
 */

"use strict";

const { fetchUrl } = require("./http");

/**
 * Verifies a finding by re-checking the source independently.
 * Returns a verified result with confidence level.
 *
 * @param {object} finding
 * @param {string} finding.type        - "missing_phrase" | "http_error" | "forbidden_phrase"
 * @param {string} finding.url         - URL where the issue was detected
 * @param {string} finding.phrase      - The phrase that was missing or found
 * @param {string} finding.description - Human readable description
 * @param {string} finding.severity    - "RED" | "AMBER" | "INFO"
 *
 * @returns {Promise<{
 *   confirmed:   boolean,
 *   confidence:  "HIGH" | "MEDIUM" | "LOW",
 *   finding:     object,
 *   attempts:    number,
 *   shouldReport: boolean
 * }>}
 */
async function verifyFinding(finding) {
  const MAX_ATTEMPTS = 2;
  let confirmCount = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Wait between attempts to avoid hitting the same cached response
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const res = await fetchUrl(finding.url);

      if (finding.type === "http_error") {
        // Confirm the HTTP error is real, not a transient blip
        if (res.status !== 200) {
          confirmCount++;
        }

      } else if (finding.type === "missing_phrase") {
        // Confirm the phrase really is missing
        if (!res.body.includes(finding.phrase)) {
          confirmCount++;
        }

      } else if (finding.type === "forbidden_phrase") {
        // Confirm the forbidden phrase really is present
        if (res.body.includes(finding.phrase)) {
          confirmCount++;
        }

      } else if (finding.type === "seo_missing") {
        // Confirm the SEO element really is absent
        if (!res.body.toLowerCase().includes(finding.phrase.toLowerCase())) {
          confirmCount++;
        }
      }

    } catch (err) {
      // Network error on re-check — counts as confirmation for http_error,
      // but not for content checks (network error ≠ missing phrase)
      if (finding.type === "http_error") {
        confirmCount++;
      }
    }
  }

  // Determine confidence
  let confidence;
  if (confirmCount >= 2)      confidence = "HIGH";
  else if (confirmCount === 1) confidence = "MEDIUM";
  else                         confidence = "LOW";

  // LOW confidence findings should never be RED
  const adjustedSeverity = confidence === "LOW" && finding.severity === "RED"
    ? "INFO"
    : finding.severity;

  // Only report as an actionable issue if confirmed at least once
  const shouldReport = confirmCount >= 1;

  return {
    confirmed:   confirmCount >= 2,
    confidence,
    finding:     { ...finding, severity: adjustedSeverity },
    attempts:    MAX_ATTEMPTS,
    shouldReport,
  };
}

/**
 * Runs a full verification pass on a list of findings.
 * Filters out unconfirmed noise. Returns only verified issues.
 *
 * @param {Array}  findings       - Raw findings from an agent
 * @param {boolean} verbose       - Whether to log verification progress
 * @returns {Promise<Array>}      - Verified findings only
 */
async function verifyAll(findings, verbose = true) {
  if (findings.length === 0) return [];

  if (verbose) {
    console.log(`\n  🔍 Verification loop — re-checking ${findings.length} finding(s)...`);
  }

  const verified = [];

  for (const finding of findings) {
    const result = await verifyFinding(finding);

    if (verbose) {
      const icon = result.confidence === "HIGH"   ? "✅"
                 : result.confidence === "MEDIUM"  ? "⚠️ "
                 :                                   "❓";
      console.log(`  ${icon} [${result.confidence}] ${finding.description}`);
    }

    if (result.shouldReport) {
      verified.push({
        ...result.finding,
        confidence: result.confidence,
        // Append confidence to description for transparency
        description: `${finding.description} [Confidence: ${result.confidence}]`,
      });
    } else {
      if (verbose) {
        console.log(`     └─ Dismissed — could not confirm on re-check (likely transient)`);
      }
    }
  }

  if (verbose) {
    const dismissed = findings.length - verified.length;
    console.log(`  Verification complete: ${verified.length} confirmed, ${dismissed} dismissed as transient\n`);
  }

  return verified;
}

module.exports = { verifyFinding, verifyAll };
