#!/usr/bin/env node
/**
 * BEACON PROJECT — Domain Fix Script
 * ====================================
 * Run this from your ukfirsthomeguide project folder:
 *   node fix-domains.js
 *
 * What it does:
 *  - Replaces all firsthomeguide.co.uk references with ukfirsthomeguide.co.uk
 *  - Fixes canonical URLs for correct SEO
 *  - Updates footer copyright domain
 *
 * After running:
 *  git add .
 *  git commit -m "Fix domain references to ukfirsthomeguide.co.uk"
 *  git push
 */

const fs   = require('fs');
const path = require('path');

const OLD = 'firsthomeguide.co.uk';
const NEW = 'ukfirsthomeguide.co.uk';

// Get all HTML files in current directory
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let totalFixed = 0;

files.forEach(filename => {
  const content  = fs.readFileSync(filename, 'utf8');
  const updated  = content.split(OLD).join(NEW);
  const changes  = (content.match(new RegExp(OLD, 'g')) || []).length;

  if (changes > 0) {
    fs.writeFileSync(filename, updated);
    console.log(`✅ Fixed ${filename} — ${changes} reference(s) updated`);
    totalFixed += changes;
  } else {
    console.log(`— ${filename} — no changes needed`);
  }
});

console.log(`\nDone. ${totalFixed} total references updated across ${files.length} files.`);
console.log('\nNext steps:');
console.log('  git add .');
console.log('  git commit -m "Fix domain references to ukfirsthomeguide.co.uk"');
console.log('  git push');
