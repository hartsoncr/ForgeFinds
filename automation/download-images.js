#!/usr/bin/env node

/**
 * Download product images from Amazon URLs and store locally
 * Also verifies affiliate links are working
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DEALS_FILE = path.join(__dirname, '../data/deals.json');
const IMAGES_DIR = path.join(__dirname, '../images/products');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  console.log(`✅ Created directory: ${IMAGES_DIR}`);
}

// Download a file from a URL
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(dest);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Verify affiliate link returns valid redirect
function verifyAffiliateLink(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { method: 'HEAD' }, (response) => {
      const isValid = response.statusCode === 200 || 
                     response.statusCode === 301 || 
                     response.statusCode === 302;
      resolve({
        url,
        statusCode: response.statusCode,
        valid: isValid,
        redirect: response.headers.location
      });
    }).on('error', (err) => {
      resolve({ url, valid: false, error: err.message });
    });
  });
}

async function processDeals() {
  console.log('📦 Loading deals...');
  const dealsData = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf8'));
  let updated = false;
  
  console.log(`\n🔍 Processing ${dealsData.length} deals...\n`);
  
  for (let i = 0; i < dealsData.length; i++) {
    const deal = dealsData[i];
    console.log(`[${i + 1}/${dealsData.length}] ${deal.title}`);
    
    // Verify affiliate link
    console.log(`  ✓ Checking affiliate link...`);
    const linkCheck = await verifyAffiliateLink(deal.affiliate_url);
    if (linkCheck.valid) {
      console.log(`  ✅ Affiliate link valid (${linkCheck.statusCode})`);
    } else {
      console.log(`  ❌ Affiliate link FAILED: ${linkCheck.error || linkCheck.statusCode}`);
    }
    
    // Download image if it's an external URL
    if (deal.image_url && deal.image_url.startsWith('http')) {
      const slug = deal.slug || deal.affiliate_url.match(/\/dp\/([A-Z0-9]+)/)?.[1] || `deal-${i}`;
      const ext = path.extname(new URL(deal.image_url).pathname) || '.jpg';
      const filename = `${slug}${ext}`;
      const localPath = path.join(IMAGES_DIR, filename);
      
      if (!fs.existsSync(localPath)) {
        console.log(`  📥 Downloading image...`);
        try {
          await downloadFile(deal.image_url, localPath);
          deal.image_url = `/images/products/${filename}`;
          updated = true;
          console.log(`  ✅ Saved to: ${filename}`);
        } catch (err) {
          console.log(`  ⚠️  Failed to download: ${err.message}`);
        }
      } else {
        console.log(`  ⏭️  Image already exists: ${filename}`);
        deal.image_url = `/images/products/${filename}`;
        updated = true;
      }
    } else {
      console.log(`  ℹ️  Image already local: ${deal.image_url}`);
    }
    
    console.log('');
  }
  
  if (updated) {
    console.log('💾 Saving updated deals.json...');
    fs.writeFileSync(DEALS_FILE, JSON.stringify(dealsData, null, 2));
    console.log('✅ deals.json updated with local image paths\n');
  } else {
    console.log('ℹ️  No updates needed\n');
  }
  
  console.log('🎉 Complete!');
}

// Run the script
processDeals().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
