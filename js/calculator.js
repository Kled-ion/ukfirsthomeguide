/**
 * FIRST HOME GUIDE — Stamp Duty Calculator Engine
 * =================================================
 * Accurate SDLT calculations for England & Northern Ireland.
 * Rates verified from GOV.UK and confirmed for 2026.
 *
 * Rate source: HMRC SDLT residential property rates
 * Last verified: April 2025 (no changes announced for 2026)
 *
 * IMPORTANT: Tax rules change. Always verify with HMRC before
 * making financial decisions.
 */

"use strict";

// ── SDLT Rate Bands ───────────────────────────────────────────────────────
// Each band: { threshold: upper limit of this band, rate: decimal }
// Bands are applied progressively (like income tax)

const SDLT_BANDS = {

  // Standard residential buyer (main residence, not FTB)
  standard: [
    { threshold: 125_000, rate: 0.00 },
    { threshold: 250_000, rate: 0.02 },
    { threshold: 925_000, rate: 0.05 },
    { threshold: 1_500_000, rate: 0.10 },
    { threshold: Infinity, rate: 0.12 },
  ],

  // First-time buyer relief
  // 0% up to £300,000. 5% on £300,001–£500,000.
  // If price > £500,000: standard rates apply (no relief)
  ftb: [
    { threshold: 300_000, rate: 0.00 },
    { threshold: 500_000, rate: 0.05 },
    // Above £500k: standard rates kick in (handled in calcSDLT)
  ],

  // Additional property surcharge: +5% on top of standard rates
  // Applies from the first pound (not just above the nil-rate threshold)
  additional: [
    { threshold: 125_000, rate: 0.05 },  // 0% standard + 5% surcharge
    { threshold: 250_000, rate: 0.07 },  // 2% + 5%
    { threshold: 925_000, rate: 0.10 },  // 5% + 5%
    { threshold: 1_500_000, rate: 0.15 },// 10% + 5%
    { threshold: Infinity, rate: 0.17 }, // 12% + 5%
  ],
};

// Non-resident surcharge rate (additional 2% on top of any applicable rates)
const NON_RESIDENT_SURCHARGE = 0.02;

// ── Core Calculation Engine ───────────────────────────────────────────────

/**
 * Applies progressive band rates to a property price.
 * Works identically to income tax band calculations.
 *
 * @param {number} price      - Property price in GBP
 * @param {Array}  bands      - Rate band array (see SDLT_BANDS)
 * @returns {Array<{band: string, taxable: number, rate: number, tax: number}>}
 */
function applyBands(price, bands) {
  const breakdown = [];
  let remaining = price;
  let prevThreshold = 0;

  for (const band of bands) {
    if (remaining <= 0) break;

    const bandSize  = band.threshold - prevThreshold;
    const taxable   = Math.min(remaining, bandSize);
    const tax       = Math.round(taxable * band.rate * 100) / 100;

    breakdown.push({
      from:    prevThreshold,
      to:      Math.min(price, band.threshold),
      taxable: Math.round(taxable),
      rate:    band.rate,
      tax:     Math.round(tax),
    });

    remaining     -= taxable;
    prevThreshold  = band.threshold;
  }

  return breakdown;
}

/**
 * Main SDLT calculation function.
 *
 * @param {number}  price         - Property price in GBP
 * @param {string}  buyerType     - "ftb" | "standard" | "additional"
 * @param {boolean} nonResident   - Whether 2% non-resident surcharge applies
 *
 * @returns {{
 *   total:       number,           // Total SDLT due in GBP
 *   breakdown:   Array,            // Band-by-band breakdown
 *   effectiveRate: number,         // Total as % of purchase price
 *   ftbRelief:   number,           // Saving vs standard buyer (FTB only)
 *   additionalSurcharge: number,   // Extra cost of surcharge (additional only)
 *   nonResidentSurcharge: number,  // Extra cost of non-resident surcharge
 * }}
 */
function calcSDLT(price, buyerType = 'standard', nonResident = false) {
  if (!price || price <= 0) {
    return { total: 0, breakdown: [], effectiveRate: 0, ftbRelief: 0, additionalSurcharge: 0, nonResidentSurcharge: 0 };
  }

  let bands;
  let isFtbRelief = false;

  if (buyerType === 'ftb' && price <= 500_000) {
    // FTB relief applies
    bands = SDLT_BANDS.ftb;
    isFtbRelief = true;
  } else if (buyerType === 'ftb' && price > 500_000) {
    // FTB relief does NOT apply above £500k — standard rates
    bands = SDLT_BANDS.standard;
  } else if (buyerType === 'additional') {
    bands = SDLT_BANDS.additional;
  } else {
    bands = SDLT_BANDS.standard;
  }

  const breakdown  = applyBands(price, bands);
  let   total      = breakdown.reduce((sum, b) => sum + b.tax, 0);

  // Non-resident surcharge: 2% on total purchase price
  let nonResidentSurcharge = 0;
  if (nonResident) {
    nonResidentSurcharge = Math.round(price * NON_RESIDENT_SURCHARGE);
    total += nonResidentSurcharge;
  }

  // Calculate FTB saving vs standard buyer
  let ftbRelief = 0;
  if (isFtbRelief) {
    const standardTotal = calcSDLT(price, 'standard', nonResident).total - nonResidentSurcharge;
    const ftbTotal      = breakdown.reduce((sum, b) => sum + b.tax, 0);
    ftbRelief = Math.max(0, standardTotal - ftbTotal);
  }

  // Calculate additional surcharge cost vs standard buyer
  let additionalSurcharge = 0;
  if (buyerType === 'additional') {
    const standardTotal = calcSDLT(price, 'standard').total;
    additionalSurcharge = Math.max(0, total - nonResidentSurcharge - standardTotal);
  }

  const effectiveRate = price > 0 ? ((total / price) * 100) : 0;

  return {
    total:                Math.round(total),
    breakdown,
    effectiveRate:        Math.round(effectiveRate * 100) / 100,
    ftbRelief:            Math.round(ftbRelief),
    additionalSurcharge:  Math.round(additionalSurcharge),
    nonResidentSurcharge: Math.round(nonResidentSurcharge),
    isFtbRelief,
  };
}

/**
 * Formats a number as GBP currency.
 * @param {number} amount
 * @returns {string} e.g. "£12,500"
 */
function formatGBP(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '£0';
  return `£${Math.round(amount).toLocaleString('en-GB')}`;
}

/**
 * Formats a band range as a human-readable string.
 * @param {number} from
 * @param {number} to
 * @returns {string} e.g. "£125,001 – £250,000"
 */
function formatBandRange(from, to) {
  const fromStr = from === 0 ? `£0` : `${formatGBP(from + 1)}`;
  const toStr   = to >= 1_500_000 ? `above ${formatGBP(1_500_000)}` : formatGBP(to);
  return `${fromStr} – ${toStr}`;
}
