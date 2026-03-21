const { notarize } = require('@electron/notarize');
const path = require('node:path');

module.exports = async function notarizeAfterSign(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== 'darwin') return;

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;

  const appleApiKey = process.env.APPLE_API_KEY;
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;

  const hasApiKeyAuth = Boolean(appleApiKey && appleApiKeyId && appleApiIssuer);
  const hasAppleIdAuth = Boolean(appleId && appleIdPassword && appleTeamId);

  if (!hasApiKeyAuth && !hasAppleIdAuth) {
    console.warn(
      '[notarize] Skipped: missing notarization credentials. ' +
      'Set APPLE_API_KEY/APPLE_API_KEY_ID/APPLE_API_ISSUER (recommended) ' +
      'or APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD/APPLE_TEAM_ID.',
    );
    return;
  }

  if (hasApiKeyAuth) {
    await notarize({
      appPath,
      appleApiKey,
      appleApiKeyId,
      appleApiIssuer,
      tool: 'notarytool',
    });
    console.log('[notarize] Completed via API key.');
    return;
  }

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId: appleTeamId,
    tool: 'notarytool',
  });
  console.log('[notarize] Completed via Apple ID app-specific password.');
};

