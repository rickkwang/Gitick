const requiredApiKeyEnv = ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER'];
const requiredAppleIdEnv = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];

const missing = (keys) => keys.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');

const missingApiKey = missing(requiredApiKeyEnv);
const missingAppleId = missing(requiredAppleIdEnv);

const hasApiKeyAuth = missingApiKey.length === 0;
const hasAppleIdAuth = missingAppleId.length === 0;

if (!hasApiKeyAuth && !hasAppleIdAuth) {
  console.error(
    '[release:signed] Missing notarization credentials.\n' +
    `Provide either API key auth (${requiredApiKeyEnv.join(', ')})\n` +
    `or Apple ID auth (${requiredAppleIdEnv.join(', ')}).`,
  );
  process.exit(1);
}

if (hasApiKeyAuth) {
  console.log('[release:signed] Using API key notarization credentials.');
} else {
  console.log('[release:signed] Using Apple ID notarization credentials.');
}

