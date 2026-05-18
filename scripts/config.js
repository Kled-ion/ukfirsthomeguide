/**
 * ============================================================
 * BEACON PROJECT — Agent Configuration & Shared Utilities
 * ============================================================
 * File:        scripts/config.js
 * Purpose:     Single source of truth for all agent settings.
 *              Every agent imports from here. Change a URL,
 *              threshold, or keyword in ONE place only.
 * Used by:     All agents (agent-*.js)
 * Owner:       Kleds (Kled-ion on GitHub)
 * Last verified: 18 May 2026
 * ============================================================
 */

"use strict";

// ── Sites ─────────────────────────────────────────────────────────────────
const SITES = {

  smartSacrifice: {
    name:        "Smart Sacrifice",
    domain:      "smartsacrifice.co.uk",
    baseUrl:     "https://www.smartsacrifice.co.uk",
    githubRepo:  "Kled-ion/smartsacrifice",

    // All pages that must return HTTP 200
    pages: [
      { path: "/",             name: "Homepage",       critical: true  },
      { path: "/about.html",   name: "About",          critical: true  }, // Legal: affiliate disclosure
      { path: "/privacy.html", name: "Privacy Policy", critical: true  }, // Legal: GDPR required
      { path: "/sitemap.xml",  name: "Sitemap",        critical: false },
    ],

    // Phrases that MUST appear on the homepage to confirm content loaded
    // If missing, the page may be blank or erroring silently
    requiredPhrases: [
      "Salary Sacrifice Calculator",
      "HMRC",
      "2026/27",
      "not constitute regulated financial advice",  // Legal disclaimer
      "Sponsored",                                   // Affiliate disclosure
    ],

    // Phrases that must NOT appear (leftover placeholders = broken links)
    forbiddenPhrases: [
      "YOUR_AWIN_ID",
      "firsthomeguide.co.uk",
      "2025/26 Tax Year",        // Old tax year label
      "Updated April 2025",      // Old update date
    ],

    // SEO keywords to track weekly rankings for
    seoKeywords: [
      "salary sacrifice calculator uk",
      "salary sacrifice pension 2026",
      "salary sacrifice NI saving",
      "salary sacrifice calculator 2026/27",
      "how much do I save salary sacrifice",
    ],

    // Current tax rates hardcoded in calculator.js — verify weekly against HMRC
    taxRates: {
      personalAllowance: 12_570,
      basicRateLimit:    50_270,
      higherRateLimit:  125_140,
      basicRate:          0.20,
      higherRate:         0.40,
      additionalRate:     0.45,
      niPrimaryThreshold: 12_570,
      niUpperEarningsLimit: 50_270,
      niMainRate:          0.08,
      niHigherRate:        0.02,
      employerNiRate:      0.138,
      plan2Threshold:     27_295,
      plan5Threshold:     25_000,
      studentLoanRate:     0.09,
      taxYear:           "2026/27",
    },
  },

  ukFirstHomeGuide: {
    name:       "UK First Home Guide",
    domain:     "ukfirsthomeguide.co.uk",
    baseUrl:    "https://www.ukfirsthomeguide.co.uk",
    githubRepo: "Kled-ion/ukfirsthomeguide",

    pages: [
      { path: "/",                               name: "Homepage",           critical: true  },
      { path: "/stamp-duty-calculator.html",     name: "SDLT Calculator",    critical: true  },
      { path: "/first-time-buyer-guide.html",    name: "FTB Guide",          critical: false },
      { path: "/mortgage-deposit-guide.html",    name: "Deposit Guide",      critical: false },
      { path: "/conveyancing-guide.html",        name: "Conveyancing Guide", critical: false },
      { path: "/shared-ownership-guide.html",    name: "Shared Ownership",   critical: false },
      { path: "/first-time-buyer-checklist.html",name: "FTB Checklist",      critical: false },
      { path: "/about.html",                     name: "About",              critical: true  },
      { path: "/privacy.html",                   name: "Privacy Policy",     critical: true  },
      { path: "/sitemap.xml",                    name: "Sitemap",            critical: false },
    ],

    requiredPhrases: [
      "Stamp Duty",
      "First-Time Buyer",
      "2026",
      "not constitute financial advice",
      "Sponsored",
      "ukfirsthomeguide.co.uk",   // Confirms domain fix was applied
    ],

    forbiddenPhrases: [
      "YOUR_AWIN_ID",
      "firsthomeguide.co.uk",     // Wrong domain — must never appear
      "www.firsthomeguide.co.uk", // Wrong canonical URL
    ],

    seoKeywords: [
      "stamp duty calculator 2026",
      "first time buyer stamp duty 2026",
      "how much deposit first time buyer uk",
      "conveyancing uk 2026",
      "shared ownership pros cons uk",
    ],

    // SDLT rates hardcoded in js/calculator.js — verify weekly against HMRC
    sdltRates: {
      standardBands: [
        { from: 0,       to: 125_000,   rate: 0.00 },
        { from: 125_001, to: 250_000,   rate: 0.02 },
        { from: 250_001, to: 925_000,   rate: 0.05 },
        { from: 925_001, to: 1_500_000, rate: 0.10 },
        { from: 1_500_001, to: Infinity, rate: 0.12 },
      ],
      ftbNilRateThreshold:  300_000,
      ftbMaxRelief:         500_000,
      ftbRateAboveThreshold: 0.05,
      additionalSurcharge:   0.05,
      nonResidentSurcharge:  0.02,
    },
  },
};

// ── Official Source URLs (Agent 1 checks these) ───────────────────────────
// If HMRC updates these pages, our rates may need updating too
const OFFICIAL_SOURCES = {
  incomeTaxRates:    "https://www.gov.uk/income-tax-rates",
  nationalInsurance: "https://www.gov.uk/national-insurance/how-much-you-pay",
  studentLoans:      "https://www.gov.uk/repaying-your-student-loan",
  sdltRates:         "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates",
  sdltOverview:      "https://www.gov.uk/stamp-duty-land-tax",
  lifetimeIsa:       "https://www.gov.uk/lifetime-isa",
  boeBaseRate:       "https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate",
};

// ── Competitor URLs (Agent 5 monitors these) ──────────────────────────────
const COMPETITORS = {
  moneySavingExpert: {
    name: "MoneySavingExpert",
    salaryPage: "https://www.moneysavingexpert.com/savings/salary-sacrifice/",
    ftbPage:    "https://www.moneysavingexpert.com/mortgages/first-time-buyer-guide/",
  },
  moneySupermarket: {
    name: "MoneySupermarket",
    sdltPage: "https://www.moneysupermarket.com/mortgages/stamp-duty-calculator/",
  },
  which: {
    name: "Which?",
    ftbPage: "https://www.which.co.uk/money/mortgages-and-property/first-time-buyers",
  },
};

// ── Agent Schedule (matches GitHub Actions cron) ──────────────────────────
const SCHEDULE = {
  daily:   "0 8 * * *",    // 8am UTC every day
  weekly:  "0 8 * * 1",    // 8am UTC every Monday
  monthly: "0 8 1 * *",    // 8am UTC first day of month
};

// ── Severity Levels ───────────────────────────────────────────────────────
const SEVERITY = {
  RED:   "🔴 RED — Action required today",
  AMBER: "🟠 AMBER — Action required this week",
  GREEN: "✅ GREEN — All clear",
  INFO:  "🟡 INFO — For your awareness",
};

// ── HTTP request timeout ───────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds


// ── Affiliate Partners (Agent 4) ──────────────────────────────────────────
const AFFILIATE_PARTNERS = [
  { name:"PensionBee",    site:"smartSacrifice",   url:"https://www.pensionbee.com",         checkPhrase:"pension"    },
  { name:"Nutmeg",        site:"smartSacrifice",   url:"https://www.nutmeg.com",             checkPhrase:"investment" },
  { name:"Vanguard UK",   site:"smartSacrifice",   url:"https://www.vanguardinvestor.co.uk", checkPhrase:"invest"     },
  { name:"Habito",        site:"ukFirstHomeGuide", url:"https://www.habito.com",             checkPhrase:"mortgage"   },
  { name:"L&C Mortgages", site:"ukFirstHomeGuide", url:"https://www.landc.co.uk",            checkPhrase:"mortgage"   },
  { name:"Reallymoving",  site:"ukFirstHomeGuide", url:"https://www.reallymoving.com",       checkPhrase:"conveyance" },
];

// ── External links to verify monthly (Agent 6) ───────────────────────────
const EXTERNAL_LINKS = [
  { url:"https://www.gov.uk/income-tax-rates",                             name:"HMRC income tax rates"    },
  { url:"https://www.gov.uk/stamp-duty-land-tax",                          name:"HMRC SDLT overview"        },
  { url:"https://www.gov.uk/stamp-duty-land-tax/residential-property-rates", name:"HMRC SDLT rates"        },
  { url:"https://www.gov.uk/lifetime-isa",                                 name:"HMRC Lifetime ISA"         },
  { url:"https://www.gov.uk/repaying-your-student-loan",                   name:"HMRC student loans"        },
  { url:"https://ico.org.uk",                                              name:"ICO — data regulator"      },
  { url:"https://www.fca.org.uk",                                          name:"FCA — financial regulator" },
  { url:"https://www.sra.org.uk/consumers/register/",                      name:"SRA solicitor register"    },
  { url:"https://www.unbiased.co.uk",                                      name:"Unbiased IFA finder"       },
];

module.exports = {
  SITES, OFFICIAL_SOURCES, COMPETITORS, SCHEDULE, SEVERITY,
  REQUEST_TIMEOUT_MS, AFFILIATE_PARTNERS, EXTERNAL_LINKS,
};
