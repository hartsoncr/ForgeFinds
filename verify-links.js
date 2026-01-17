const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const deals = JSON.parse(fs.readFileSync('/workspaces/ForgeFinds/data/deals.json', 'utf8'));

console.log('🔍 Verifying affiliate links...\n');

let checked = 0;
const issues = [];

deals.forEach((deal, i) => {
  const url = deal.affiliate_url;
  
  // Check if affiliate tag is present
  if (!url.includes('tag=forgefinds20-20')) {
    issues.push(`⚠️  ${deal.title.substring(0,50)}: Missing affiliate tag`);
  }
  
  // Check if URL is valid
  try {
    new URL(url);
  } catch (e) {
    issues.push(`❌ ${deal.title.substring(0,50)}: Invalid URL format`);
    checked++;
    return;
  }
  
  // Test if URL responds (HEAD request)
  const urlObj = new URL(url);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'HEAD',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ForgeFindsBot/1.0)'
    }
  };
  
  https.request(options, (res) => {
    checked++;
    if (res.statusCode >= 200 && res.statusCode < 400) {
      console.log(`✓ ${deal.title.substring(0,50)} → ${res.statusCode}`);
    } else {
      issues.push(`⚠️  ${deal.title.substring(0,50)}: HTTP ${res.statusCode}`);
    }
    
    if (checked === deals.length) {
      console.log(`\n📊 Checked ${checked} links`);
      if (issues.length) {
        console.log('\n⚠️  Issues found:');
        issues.forEach(i => console.log(i));
      } else {
        console.log('\n✅ All links verified successfully!');
      }
    }
  }).on('error', (err) => {
    checked++;
    issues.push(`❌ ${deal.title.substring(0,50)}: ${err.message}`);
    
    if (checked === deals.length) {
      console.log(`\n📊 Checked ${checked} links`);
      if (issues.length) {
        console.log('\n⚠️  Issues found:');
        issues.forEach(i => console.log(i));
      }
    }
  }).end();
});
