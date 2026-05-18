# Beacon Agent System

Automated monitoring for smartsacrifice.co.uk and ukfirsthomeguide.co.uk.

## What This Does

Seven agents run on a schedule via GitHub Actions. You receive email from GitHub if anything fails. If everything is fine, you hear nothing.

| Agent | File | Schedule | Monitors |
|---|---|---|---|
| 1 | agent-1-accuracy.js | Daily | HMRC tax rates, SDLT rates — are our calculators still correct? |
| 2 | agent-2-health.js | Daily | All pages return HTTP 200, required content present, no broken links |
| 3 | agent-3-seo.js | Weekly | Canonical URLs, meta tags, schema markup, sitemap accessibility |
| 4 | agent-4-affiliate.js | Weekly | Partner homepages live, no placeholder links, Awin programmes active |
| 5 | agent-5-competitor.js | Weekly | MSE, MoneySupermarket, Which? — any new tools or content gaps |
| 6 | agent-6-freshness.js | Monthly | Stale year references, broken external links, seasonal opportunities |
| 7 | agent-7-legal.js | Monthly | Financial disclaimers, affiliate disclosures, privacy policy accessible |
| — | weekly-digest.js | Monday | Runs all agents and produces one 5-minute summary report |

## Setup

### Deploy to ukfirsthomeguide repo (recommended)

```bash
# From your ukfirsthomeguide project folder
mkdir -p scripts .github/workflows

# Copy all agent files
cp path/to/beacon-agents/scripts/*.js scripts/

# Copy GitHub Actions workflow
cp path/to/beacon-agents/.github/workflows/beacon-agents.yml .github/workflows/

# Push
git add .
git commit -m "Add complete agent monitoring system"
git push
```

GitHub Actions runs automatically from that point. No further setup needed.

### Run manually

```bash
# Run a single agent
node scripts/agent-2-health.js

# Run the full weekly digest
node scripts/weekly-digest.js
```

### Check agent results

1. Go to your GitHub repo: github.com/Kled-ion/ukfirsthomeguide
2. Click the **Actions** tab
3. Each agent run is listed with pass/fail status
4. Click any run to see the full output log

## File Structure

```
scripts/
  config.js              ← All settings. Change things here ONLY.
  http.js                ← Shared HTTP utility
  agent-1-accuracy.js    ← HMRC rate verification
  agent-2-health.js      ← Site uptime and content checks
  agent-3-seo.js         ← SEO signal verification
  agent-4-affiliate.js   ← Affiliate partner health
  agent-5-competitor.js  ← Competitor monitoring
  agent-6-freshness.js   ← Content freshness audit
  agent-7-legal.js       ← Legal compliance monitoring
  weekly-digest.js        ← Consolidated Monday report

.github/workflows/
  beacon-agents.yml      ← GitHub Actions schedule and jobs
```

## When An Agent Fails

GitHub emails you automatically when any agent exits with code 1 (failure).

The email subject will be: `[Kled-ion/ukfirsthomeguide] Run failed: Beacon Agent System`

Click the link in the email → Actions tab → Failed run → Read the output.

**RED issues** require action today.
**AMBER issues** require action this week.
**GREEN** means nothing to do.

## Updating Settings

All configurable values live in `scripts/config.js`. This is the only file you
(or Claude) need to edit when:
- A new affiliate partner is added
- A new site page is created
- A new SEO keyword needs tracking
- Tax rate thresholds change

Never hardcode values in individual agent files.

## Owner

Kleds — github.com/Kled-ion
Built with Claude (Anthropic)
