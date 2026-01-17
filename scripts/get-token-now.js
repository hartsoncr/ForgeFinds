#!/usr/bin/env node
const http = require('http');
const fetch = require('node-fetch');
const { exec } = require('child_process');

// IMPORTANT: Get these from Google Cloud Console OAuth 2.0 credentials
// They should match your YouTube Data API v3 OAuth app
const client_id = process.env.YT_CLIENT_ID || '';
const client_secret = process.env.YT_CLIENT_SECRET || '';
const redirect_uri = 'http://localhost:8080/oauth2callback';

const scope = 'https://www.googleapis.com/auth/youtube.upload';
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', client_id);
authUrl.searchParams.set('redirect_uri', redirect_uri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404); 
    return res.end();
  }
  const code = new URL(req.url, redirect_uri).searchParams.get('code');
  res.end('✅ Auth received! You can close this tab and check your terminal.');
  server.close();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    }).toString()
  });
  
  if (!tokenRes.ok) {
    console.error('❌ Token exchange failed:', tokenRes.status, await tokenRes.text());
    process.exit(1);
  }
  
  const json = await tokenRes.json();
  console.log('\n✅ SUCCESS! Your tokens:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Access Token:', json.access_token);
  console.log('\n🎯 REFRESH TOKEN (copy this):', json.refresh_token);
  console.log('\nExpires In:', json.expires_in, 'seconds');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n👉 Copy the REFRESH TOKEN above and add it to your .env file as:');
  console.log('   YT_REFRESH_TOKEN=' + json.refresh_token);
});

server.listen(8080, () => {
  console.log('🚀 Starting OAuth flow...');
  console.log('\n🌐 Opening browser for consent...');
  console.log('If browser does not open, visit this URL:\n');
  console.log(authUrl.toString());
  console.log('\n📋 Instructions:');
  console.log('1. Sign in with your YouTube account');
  console.log('2. Click "Allow" to grant upload permission');
  console.log('3. Come back here to see your refresh token');
  console.log('');
  
  const url = authUrl.toString();
  const platform = process.platform;
  const cmd = platform === 'darwin' ? `open "${url}"` : 
              platform === 'win32' ? `start "${url}"` : 
              `"$BROWSER" "${url}"`;
  
  exec(cmd, (err) => {
    if (err) console.log('(Could not auto-open browser, please use the URL above)');
  });
});
