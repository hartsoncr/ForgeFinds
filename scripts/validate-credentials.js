#!/usr/bin/env node

/**
 * Credential Validation Script
 * 
 * Checks which credentials are configured and which are missing.
 * Provides links to documentation for setting up missing credentials.
 */

require('dotenv').config();

const CREDENTIAL_GROUPS = {
  'Video Upload (Optional)': {
    credentials: [
      {
        name: 'PEXELS_API_KEY',
        description: 'Pexels API key for stock video footage',
        required: false,
        setupUrl: 'https://www.pexels.com/api/',
        setupSteps: [
          'Go to https://www.pexels.com/api/',
          'Sign up for a free account',
          'Generate an API key',
          'Add to .env as PEXELS_API_KEY'
        ]
      },
      {
        name: 'OPENAI_API_KEY',
        description: 'OpenAI API key for script generation and TTS',
        required: false,
        setupUrl: 'https://platform.openai.com/api-keys',
        setupSteps: [
          'Go to https://platform.openai.com/api-keys',
          'Sign in or create an account',
          'Create a new API key',
          'Add to .env as OPENAI_API_KEY'
        ]
      },
      {
        name: 'YT_CLIENT_ID',
        description: 'YouTube OAuth Client ID',
        required: false,
        setupUrl: 'See SETUP.md',
        setupSteps: [
          'Create a Google Cloud project',
          'Enable YouTube Data API v3',
          'Create OAuth 2.0 credentials (Desktop app)',
          'Copy the Client ID',
          'Add to .env as YT_CLIENT_ID'
        ]
      },
      {
        name: 'YT_CLIENT_SECRET',
        description: 'YouTube OAuth Client Secret',
        required: false,
        setupUrl: 'See SETUP.md',
        setupSteps: [
          'Use the same OAuth credentials from YT_CLIENT_ID',
          'Copy the Client Secret',
          'Add to .env as YT_CLIENT_SECRET'
        ]
      },
      {
        name: 'YT_REFRESH_TOKEN',
        description: 'YouTube OAuth Refresh Token',
        required: false,
        setupUrl: 'Run: npm run youtube:refresh-token',
        setupSteps: [
          'Ensure YT_CLIENT_ID and YT_CLIENT_SECRET are set',
          'Run: npm run youtube:refresh-token',
          'Follow the OAuth flow in your browser',
          'Copy the refresh token from the output',
          'Add to .env as YT_REFRESH_TOKEN'
        ]
      },
      {
        name: 'YT_CHANNEL_ID',
        description: 'YouTube Channel ID',
        required: false,
        setupUrl: 'YouTube Studio → Settings',
        setupSteps: [
          'Go to YouTube Studio',
          'Click Settings → Channel → Advanced settings',
          'Copy your Channel ID (starts with UC...)',
          'Add to .env as YT_CHANNEL_ID'
        ]
      },
      {
        name: 'FORGEFINDS_LOGO_PATH',
        description: 'Path to ForgeFinds logo for video overlay',
        required: false,
        setupUrl: 'N/A - Local file path',
        setupSteps: [
          'Default: ./forgefinds-logo.png',
          'Ensure the logo file exists at the specified path',
          'Add to .env as FORGEFINDS_LOGO_PATH'
        ]
      }
    ]
  },
  'Deal Scraping (Core)': {
    credentials: [
      {
        name: 'AMAZON_TRACKING_ID',
        description: 'Amazon Associates affiliate tracking ID',
        required: false,
        setupUrl: 'https://affiliate-program.amazon.com/',
        setupSteps: [
          'Sign up for Amazon Associates',
          'Get your tracking ID (format: yourname-20)',
          'Add to .env as AMAZON_TRACKING_ID (optional)'
        ]
      }
    ]
  }
};

function checkCredential(envVar) {
  const value = process.env[envVar];
  return {
    configured: !!(value && value.trim()),
    value: value ? '✓ Set' : '✗ Missing'
  };
}

function printSection(title, credentials) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}\n`);

  const allConfigured = credentials.every(c => checkCredential(c.name).configured);
  const allMissing = credentials.every(c => !checkCredential(c.name).configured);

  if (allConfigured) {
    console.log('✅ All credentials configured!\n');
  } else if (allMissing) {
    console.log('⚠️  No credentials configured (feature disabled)\n');
  } else {
    console.log('⚠️  Some credentials missing\n');
  }

  credentials.forEach(cred => {
    const status = checkCredential(cred.name);
    const icon = status.configured ? '✅' : '❌';
    console.log(`${icon} ${cred.name}`);
    console.log(`   ${cred.description}`);
    console.log(`   Status: ${status.value}`);
    
    if (!status.configured) {
      console.log(`   Setup: ${cred.setupUrl}`);
    }
    console.log();
  });

  return { allConfigured, allMissing };
}

function printSetupInstructions(credentials) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 Setup Instructions for Missing Credentials');
  console.log(`${'='.repeat(60)}\n`);

  credentials.forEach(cred => {
    const status = checkCredential(cred.name);
    if (!status.configured) {
      console.log(`\n${cred.name}:`);
      cred.setupSteps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
      });
    }
  });
}

function main() {
  console.log('\n🔍 ForgeFinds Credential Validation\n');

  let hasAnyMissing = false;
  const allMissingCreds = [];

  for (const [groupName, group] of Object.entries(CREDENTIAL_GROUPS)) {
    const { allConfigured, allMissing } = printSection(groupName, group.credentials);
    
    if (!allConfigured) {
      hasAnyMissing = true;
      const missing = group.credentials.filter(c => !checkCredential(c.name).configured);
      allMissingCreds.push(...missing);
    }

    if (groupName.includes('Optional') && allMissing) {
      console.log('💡 This is an optional feature. The site works fine without it.\n');
    }
  }

  if (hasAnyMissing && allMissingCreds.length > 0) {
    printSetupInstructions(allMissingCreds);
    console.log(`\n${'='.repeat(60)}\n`);
    console.log('📚 For detailed setup instructions, see:');
    console.log('   • SETUP.md - Credential setup guide');
    console.log('   • README.md - Quick start guide');
    console.log('   • .env.example - Example configuration\n');
  } else {
    console.log(`\n${'='.repeat(60)}\n`);
    console.log('✅ All credentials are configured!\n');
  }

  // Exit with status code indicating if video upload can work
  // Note: We use exit code 0 (success) even when credentials are missing
  // because this is a validation tool, not a build/test tool.
  // Missing credentials are expected in many cases where video upload is optional.
  const videoUploadCreds = CREDENTIAL_GROUPS['Video Upload (Optional)'].credentials;
  const videoCanWork = videoUploadCreds.every(c => checkCredential(c.name).configured);
  
  if (!videoCanWork) {
    console.log('⚠️  Video upload feature is not fully configured.');
    console.log('   The daily deals scraper will still work normally.\n');
  }
}

main();
