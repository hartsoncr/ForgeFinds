/**
 * ForgeFinds Amazon Deals Scraper (with fallback mock data)
 * Currently using mock data due to Amazon anti-bot challenges
 * Production: Can integrate ProductAdvertising API later
 */

const STORE_ID = 'forgefinds20-20';

// Mock deals for testing (realistic tech products)
const MOCK_DEALS = [
  {
    title: 'ASUS TUF Gaming Laptop - Intel i7, RTX 4070, 16GB RAM, 512GB SSD',
    description: 'High-performance gaming laptop with NVIDIA RTX 4070 graphics card. Perfect for gaming and creative work.',
    price_info: '$1,299.99 (was $1,599.99)',
    display_price: '$1,299.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/71Y8lYwQWdL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B09FC2QLVB?tag=${STORE_ID}`,
    tags: ['gaming', 'laptop', 'asus', 'tuf', 'i7', 'rtx4070'],
    category: 'gaming',
    slug: 'B09FC2QLVB',
    coupon: 'Clip $50 coupon at checkout',
  },
  {
    title: 'LG 27" 4K UltraFine Monitor - USB-C, Thunderbolt 3',
    description: 'Professional grade 4K display with 27-inch IPS panel. Ideal for content creators and designers.',
    price_info: '$699.99 (was $899.99)',
    display_price: '$699.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/81D0jfD45WL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B088Z2LHBQ?tag=${STORE_ID}`,
    tags: ['monitor', 'lg', '4k', 'usb-c', 'thunderbolt'],
    category: 'computers',
    slug: 'B088Z2LHBQ',
  },
  {
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    description: 'Industry-leading noise cancellation with premium sound quality. 30-hour battery life.',
    price_info: '$349.99 (was $399.99)',
    display_price: '$349.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BQBTX75S?tag=${STORE_ID}`,
    tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
    category: 'gadgets',
    slug: 'B0BQBTX75S',
    coupon: '15% off with code SONY15',
  },
  {
    title: 'Samsung 65" QLED 4K Smart TV - 120Hz, Gaming Mode',
    description: 'Premium QLED television with quantum dot technology. Perfect for movies and gaming.',
    price_info: '$1,199.99 (was $1,799.99)',
    display_price: '$1,199.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/81B5CEU3QGL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BL8LDVVN?tag=${STORE_ID}`,
    tags: ['tv', 'samsung', 'qled', '4k', '65inch'],
    category: 'home-theater',
    slug: 'B0BL8LDVVN',
  },
  {
    title: 'Razer DeathAdder V3 Pro Wireless Gaming Mouse',
    description: 'Ultra-lightweight wireless gaming mouse with Razer HyperScroll. 70 hours battery.',
    price_info: '$129.99 (was $149.99)',
    display_price: '$129.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/71z1jDyFVhL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BLQXLVDH?tag=${STORE_ID}`,
    tags: ['mouse', 'gaming', 'razer', 'wireless'],
    category: 'gaming',
    slug: 'B0BLQXLVDH',
  },
  {
    title: 'Synology DiskStation DS924+ NAS - 4 Bay',
    description: 'Powerful network storage with quad-core processor. Great for backups and media streaming.',
    price_info: '$599.99',
    display_price: '$599.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/61EiWYrKJ4L._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BVR7RS1H?tag=${STORE_ID}`,
    tags: ['nas', 'synology', 'storage', 'network'],
    category: 'computers',
    slug: 'B0BVR7RS1H',
  },
  {
    title: 'Apple AirPods Pro (2nd Generation)',
    description: 'Active noise cancellation with spatial audio. Fast charging case included.',
    price_info: '$169.99 (was $249.00)',
    display_price: '$169.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/61SUj2mDRZL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BDHWDR12?tag=${STORE_ID}`,
    tags: ['airpods', 'wireless', 'apple', 'earbuds'],
    category: 'gadgets',
    slug: 'B0BDHWDR12',
  },
  {
    title: 'Corsair K95 Platinum XT Mechanical Keyboard - Cherry MX',
    description: 'Premium gaming keyboard with mechanical Cherry MX switches. Per-key RGB lighting.',
    price_info: '$229.99 (was $249.99)',
    display_price: '$229.99',
    store: 'Amazon',
    image_url: 'https://m.media-amazon.com/images/I/71W8Ib8SPEL._AC_SY300_.jpg',
    affiliate_url: `https://www.amazon.com/dp/B0BQBTX1CY?tag=${STORE_ID}`,
    tags: ['keyboard', 'corsair', 'mechanical', 'gaming'],
    category: 'gaming',
    slug: 'B0BQBTX1CY',
  },
];

async function scrapeAllDeals() {
  console.log(`\n=== ForgeFinds Scraper Started ===\n`);

  // Return mock deals with current timestamps
  const deals = MOCK_DEALS.map(deal => ({
    ...deal,
    publish_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  }));

  console.log(`[SUCCESS] Using ${deals.length} mock deals (Production: switch to API)`);
  console.log(`\n=== Total Deals Scraped: ${deals.length} ===\n`);
  return deals;
}

module.exports = { scrapeAllDeals, STORE_ID };
