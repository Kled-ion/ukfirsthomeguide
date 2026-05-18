/**
 * ============================================================
 * BEACON PROJECT — HTTP Utility
 * ============================================================
 * File:     scripts/http.js
 * Purpose:  Reusable HTTP fetch function used by every agent.
 *           Centralised here so timeout, error handling, and
 *           redirect following are consistent across all agents.
 *           Change fetch behaviour in ONE place only.
 * Used by:  All agents
 * Owner:    Kleds (Kled-ion on GitHub)
 * ============================================================
 */

"use strict";

const https = require("https");
const http  = require("http");
const { REQUEST_TIMEOUT_MS } = require("./config");

/**
 * Fetches a URL and returns status code, body, and headers.
 * Follows redirects automatically (up to 5 hops).
 * Times out after REQUEST_TIMEOUT_MS milliseconds.
 *
 * @param {string} url - Full URL to fetch (http or https)
 * @param {number} [redirectCount=0] - Internal redirect counter
 * @returns {Promise<{status: number, body: string, headers: object, url: string}>}
 */
function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {

    // Prevent infinite redirect loops
    if (redirectCount > 5) {
      return reject(new Error(`Too many redirects for: ${url}`));
    }

    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {

      // Follow redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, redirectCount + 1));
      }

      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({
        status:  res.statusCode,
        body,
        headers: res.headers,
        url,     // The final URL after any redirects
      }));
      res.on("error", reject);
    });

    req.on("error",   reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`));
    });
  });
}

/**
 * Checks if a URL returns HTTP 200.
 * Returns a simple pass/fail result with the status code.
 *
 * @param {string} url
 * @returns {Promise<{ok: boolean, status: number, url: string, error?: string}>}
 */
async function checkUrl(url) {
  try {
    const res = await fetchUrl(url);
    return { ok: res.status === 200, status: res.status, url };
  } catch (err) {
    return { ok: false, status: 0, url, error: err.message };
  }
}

module.exports = { fetchUrl, checkUrl };
