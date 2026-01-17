const fs = require('fs');
const https = require('https');
const path = require('path');

const deals = JSON.parse(fs.readFileSync('/workspaces/ForgeFinds/data/deals.json', 'utf8'));

// Create images directory
const imgDir = '/workspaces/ForgeFinds/images';
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

let completed = 0;

deals.forEach((deal, i) => {
  // Skip if already local
  if (deal.image_url.startsWith('/images/')) {
    completed++;
    console.log(`⊙ Already local: ${deal.image_url}`);
    return;
  }
  
  const ext = '.jpg';
  const filename = `product-${deal.slug || i}${ext}`;
  const filepath = path.join(imgDir, filename);
  
  console.log(`Downloading ${deal.title.substring(0, 40)}...`);
  
  https.get(deal.image_url, (res) => {
    const stream = fs.createWriteStream(filepath);
    res.pipe(stream);
    stream.on('finish', () => {
      stream.close();
      deal.image_url = `/images/${filename}`;
      completed++;
      console.log(`✓ Saved: ${filename}`);
      
      // Save updated deals.json after all downloads
      if (completed === deals.length) {
        fs.writeFileSync('/workspaces/ForgeFinds/data/deals.json', JSON.stringify(deals, null, 2));
        console.log('\n✓ Updated deals.json with local image paths');
      }
    });
  }).on('error', (err) => {
    completed++;
    console.error(`✗ Failed: ${filename}`, err.message);
  });
});
