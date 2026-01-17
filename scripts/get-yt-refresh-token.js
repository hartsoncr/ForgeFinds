#!/usr/bin/env node
const http = require('http');
const fetch = require('node-fetch');
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));

(async () => {
  const client_id = await ask('Google Client ID: ');
  const client_secret = await ask('Google Client Secret: ');
  const redirect_uri = await ask('Redirect URI (default http://localhost:8080/oauth2callback): ') || 'http://localhost:8080/oauth2callback';
  rl.close();

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
      res.writeHead(404); return res.end();
    }
    const code = new URL(req.url, redirect_uri).searchParams.get('code');
    res.end('Auth received. You can close this tab.');
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
      console.error('Token exchange failed:', tokenRes.status, await tokenRes.text());
      process.exit(1);
    }
    const json = await tokenRes.json();
    console.log('\n✅ SUCCESS! Your tokens:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Access Token:', json.access_token);
    console.log('Refresh Token:', json.refresh_token);
    console.log('Expires In:', json.expires_in, 'seconds');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n👉 Copy the Refresh Token above into your .env file as YT_REFRESH_TOKEN');
  });

  server.listen(8080, () => {
    console.log('🚀 Listening on http://localhost:8080 for OAuth callback...');
    console.log('\n🌐 Opening browser for consent...');
    console.log('If browser does not open, visit this URL:\n');
    console.log(authUrl.toString());
    console.log('');
    
    // Try to open browser using system default
    const url = authUrl.toString();
    const platform = process.platform;
    const cmd = platform === 'darwin' ? `open "${url}"` : 
                platform === 'win32' ? `start "${url}"` : 
                `"$BROWSER" "${url}"`;
    
    exec(cmd, (err) => {
      if (err) console.log('(Could not auto-open browser, please use the URL above)');
    });
  });
})();
