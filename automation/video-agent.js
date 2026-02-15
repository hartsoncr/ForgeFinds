#!/usr/bin/env node

/**
 * ForgeFinds Video Agent (one video at a time)
 *
 * Flow:
 * 1) Load latest deals from data/deals.json
 * 2) Skip any deal whose slug is already in data/posted.json
 * 3) Pick the newest unposted deal
 * 4) Generate a 30-60s script via OpenAI
 * 5) Fetch stock video from Pexels (free)
 * 6) Generate voiceover via OpenAI TTS
 * 7) Render video locally with FFmpeg (stock + audio + logo overlay)
 * 8) Upload to YouTube Shorts
 * 9) Mark deal as posted in data/posted.json (prevents repeats)
 *
 * 100% FREE stack: Pexels API (free) + OpenAI (pay-as-you-go) + FFmpeg (local)
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const DEALS_FILE = path.join(__dirname, '..', 'data', 'deals.json');
const POSTED_FILE = path.join(__dirname, '..', 'data', 'posted.json');

// --- Config ---
const CONFIG = {
  pexelsApiKey: process.env.PEXELS_API_KEY,
  logoPath: process.env.FORGEFINDS_LOGO_PATH,
  openAiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  ytClientId: process.env.YT_CLIENT_ID,
  ytClientSecret: process.env.YT_CLIENT_SECRET,
  ytRefreshToken: process.env.YT_REFRESH_TOKEN,
  ytChannelId: process.env.YT_CHANNEL_ID,
};

const REQUIRED = [
  'pexelsApiKey',
  'logoPath',
  'openAiKey',
  'ytClientId',
  'ytClientSecret',
  'ytRefreshToken',
  'ytChannelId',
];

const ENV_VAR_MAPPING = {
  pexelsApiKey: 'PEXELS_API_KEY',
  logoPath: 'FORGEFINDS_LOGO_PATH',
  openAiKey: 'OPENAI_API_KEY',
  ytClientId: 'YT_CLIENT_ID',
  ytClientSecret: 'YT_CLIENT_SECRET',
  ytRefreshToken: 'YT_REFRESH_TOKEN',
  ytChannelId: 'YT_CHANNEL_ID',
};

const SETUP_GUIDE_URLS = {
  pexelsApiKey: 'https://www.pexels.com/api/',
  openAiKey: 'https://platform.openai.com/api-keys',
  ytClientId: 'See SETUP.md for YouTube OAuth setup instructions',
  ytClientSecret: 'See SETUP.md for YouTube OAuth setup instructions',
  ytRefreshToken: 'Run: npm run youtube:refresh-token (see SETUP.md)',
  ytChannelId: 'YouTube Studio → Settings → Channel → Advanced settings',
};

function assertEnv() {
  const missing = REQUIRED.filter(k => !CONFIG[k]);
  if (missing.length) {
    console.error('\n❌ Missing Required Credentials\n');
    console.error('The video upload feature requires the following environment variables:\n');
    
    missing.forEach(key => {
      const envVar = ENV_VAR_MAPPING[key];
      const guide = SETUP_GUIDE_URLS[key];
      console.error(`  • ${envVar}`);
      if (guide) {
        console.error(`    → ${guide}`);
      }
    });
    
    console.error('\n📋 How to Fix:');
    console.error('  1. Copy .env.example to .env');
    console.error('  2. Fill in the missing credentials above');
    console.error('  3. See SETUP.md for detailed setup instructions');
    console.error('\n💡 Note: Video upload is optional. The site works fine without it.\n');
    process.exit(1);
  }
}

// Utility: load JSON or return fallback
function loadJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (_) {
    return fallback;
  }
}

// Utility: save JSON atomically
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Pick newest unposted deal
function pickDeal(deals, postedSet) {
  const sorted = [...deals].sort((a, b) => new Date(b.publish_at || b.created_at || 0) - new Date(a.publish_at || a.created_at || 0));
  return sorted.find(d => d.slug && !postedSet.has(d.slug));
}

// Generate script via OpenAI
async function generateScript(deal) {
  const prompt = [
    'You write concise 30-60 second promo scripts for tech deals.',
    'Tone: upbeat, clear, trustworthy.',
    'Structure: Hook (1 line), 3-4 punchy sentences on value/specs, mention price/discount/store, CTA to tap and see the deal on ForgeFinds.',
    'Word budget: 90-150 words.',
    'Do not invent specs or prices that are not provided. Use only given fields.',
    'If price missing, say "Check latest price."',
    'End with a short CTA.'
  ].join('\n');

  const body = {
    model: CONFIG.openAiModel,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify({
        title: deal.title,
        description: deal.description,
        price_info: deal.price_info,
        display_price: deal.display_price,
        pct_off: deal.__pctOff,
        store: deal.store,
        category: deal.category,
      }) }
    ],
    temperature: 0.7,
    max_tokens: 250
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.openAiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned empty content');
  return content;
}

// Fetch stock video from Pexels matching deal category
async function fetchStockVideo(deal) {
  const query = deal.category || 'technology';
  const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`, {
    headers: { 'Authorization': CONFIG.pexelsApiKey }
  });
  if (!res.ok) throw new Error(`Pexels error: ${res.status}`);
  const json = await res.json();
  const videos = json.videos?.filter(v => v.duration >= 10 && v.duration <= 60);
  if (!videos?.length) throw new Error('No suitable Pexels videos found');
  
  // Pick HD portrait video
  const video = videos[0];
  const file = video.video_files.find(f => f.width === 1080 && f.height === 1920) || video.video_files[0];
  return file.link;
}

// Generate audio voiceover via OpenAI TTS
async function generateAudio(script) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.openAiKey}`
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'alloy',
      input: script,
      speed: 1.0
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error: ${res.status} ${err}`);
  }
  const buffer = await res.buffer();
  const audioPath = path.join(__dirname, '..', 'tmp-audio.mp3');
  fs.writeFileSync(audioPath, buffer);
  return audioPath;
}

// Render video locally with FFmpeg (stock video + audio + logo overlay)
async function renderVideo(deal, script) {
  console.log('Fetching stock video from Pexels...');
  const videoUrl = await fetchStockVideo(deal);
  
  console.log('Downloading stock video...');
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`);
  const videoBuffer = await videoRes.buffer();
  const stockPath = path.join(__dirname, '..', 'tmp-stock.mp4');
  fs.writeFileSync(stockPath, videoBuffer);
  
  console.log('Generating voiceover audio...');
  const audioPath = await generateAudio(script);
  
  console.log('Rendering video with FFmpeg...');
  const outputPath = path.join(__dirname, '..', 'tmp-video.mp4');
  
  // FFmpeg: overlay logo, add audio, trim to audio duration, ensure vertical 9:16
  const { execSync } = require('child_process');
  const ffmpegCmd = [
    'ffmpeg -y',
    `-i "${stockPath}"`,
    `-i "${audioPath}"`,
    `-i "${CONFIG.logoPath}"`,
    '-filter_complex',
    '"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];',
    '[2:v]scale=150:-1[logo];',
    '[bg][logo]overlay=20:20[v]"',
    '-map "[v]"',
    '-map 1:a',
    '-shortest',
    '-c:v libx264 -preset fast -crf 23',
    '-c:a aac -b:a 128k',
    '-movflags +faststart',
    `"${outputPath}"`
  ].join(' ');
  
  try {
    execSync(ffmpegCmd, { stdio: 'inherit' });
  } catch (err) {
    throw new Error(`FFmpeg failed: ${err.message}`);
  }
  
  // Cleanup temp files
  try {
    fs.unlinkSync(stockPath);
    fs.unlinkSync(audioPath);
  } catch {}
  
  return { videoPath: outputPath };
}

// Exchange refresh token for access token
async function getYoutubeAccessToken() {
  const params = new URLSearchParams({
    client_id: CONFIG.ytClientId,
    client_secret: CONFIG.ytClientSecret,
    refresh_token: CONFIG.ytRefreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    let errObj = null;
    try {
      errObj = JSON.parse(err);
    } catch (e) {
      // Response was not JSON
    }
    
    console.error('\n❌ YouTube Authentication Failed\n');
    console.error(`Status: ${res.status}`);
    
    if (errObj?.error === 'invalid_grant') {
      console.error('\n🔑 Invalid or Expired Refresh Token\n');
      console.error('The YouTube refresh token is no longer valid. This typically happens when:');
      console.error('  • The token has expired (they can expire after 6 months of inactivity)');
      console.error('  • The OAuth consent was revoked');
      console.error('  • The client credentials changed\n');
      console.error('📋 How to Fix:');
      console.error('  1. Run: npm run youtube:refresh-token');
      console.error('  2. Follow the OAuth flow to generate a new refresh token');
      console.error('  3. Update YT_REFRESH_TOKEN in your .env or GitHub Secrets');
      console.error('  4. See SETUP.md for detailed instructions\n');
    } else {
      console.error(`Error: ${err}\n`);
      console.error('See SETUP.md for troubleshooting steps.');
    }
    
    throw new Error(`YouTube authentication failed: ${errObj?.error || res.status}`);
  }
  return res.json();
}

// Upload to YouTube Shorts (requires vertical < 60s video)
async function uploadToYouTube(deal, videoPath) {
  const tokenData = await getYoutubeAccessToken();
  const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error('No YouTube access token');

  // Simple metadata
  const title = deal.title?.slice(0, 90) || 'ForgeFinds Deal';
  const descLines = [
    deal.description || '',
    '',
    `Price: ${deal.display_price || deal.price_info || 'Check latest price'}`,
    deal.__pctOff ? `Discount: ${deal.__pctOff}% off` : '',
    '',
    'Find more deals at ForgeFinds.com',
    'Affiliate link included. Prices may change.'
  ].filter(Boolean);
  const description = descLines.join('\n');

  // Upload via multipart/related
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: '28', // Tech
      channelId: CONFIG.ytChannelId,
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    }
  };

  const boundary = '----forgefindsboundary' + Date.now();
  const body = [];
  body.push(`--${boundary}\r\n`);
  body.push('Content-Type: application/json; charset=UTF-8\r\n\r\n');
  body.push(JSON.stringify(metadata) + '\r\n');
  body.push(`--${boundary}\r\n`);
  body.push('Content-Type: video/mp4\r\n\r\n');
  body.push(fs.readFileSync(videoPath));
  body.push(`\r\n--${boundary}--`);

  const uploadRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: Buffer.concat(body.map(part => (typeof part === 'string' ? Buffer.from(part) : part)))
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`YouTube upload error: ${uploadRes.status} ${err}`);
  }
  const uploadJson = await uploadRes.json();
  return { videoId: uploadJson.id };
}

async function main() {
  assertEnv();

  const deals = loadJSON(DEALS_FILE, []);
  const posted = loadJSON(POSTED_FILE, []);
  const postedSet = new Set(posted);

  if (!deals.length) {
    console.error('No deals found. Run npm run scrape first.');
    process.exit(1);
  }

  const deal = pickDeal(deals, postedSet);
  if (!deal) {
    console.log('No new deals to post. All caught up.');
    return;
  }

  console.log(`Selected deal: ${deal.title} (${deal.slug})`);

  // 1) Script
  const script = await generateScript(deal);
  console.log('Generated script:');
  console.log(script);

  // 2) Render video locally (Pexels + FFmpeg + TTS)
  const renderResult = await renderVideo(deal, script);
  console.log('Render result:', renderResult);

  // 3) Upload to YouTube Shorts
  const uploadResult = await uploadToYouTube(deal, renderResult.videoPath);
  console.log('Upload result:', uploadResult);

  // 5) Mark as posted
  postedSet.add(deal.slug);
  saveJSON(POSTED_FILE, Array.from(postedSet));
  console.log(`Marked posted: ${deal.slug}`);

  console.log('Done.');
}

main().catch(err => {
  console.error('Agent failed:', err);
  process.exit(1);
});
