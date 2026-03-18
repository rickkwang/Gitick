const { URL } = require('url');

const ALLOWED_EXTERNAL_HOSTS = new Set(['github.com', 'www.github.com']);
const TRUSTED_RELEASE_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'objects.githubusercontent.com',
  'github-releases.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);
const RELEASE_METADATA_URL = 'https://github.com/rickkwang/Gitick/releases/latest/download/latest-mac.yml';

const isSafeExternalUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch (_) {
    return false;
  }
};

const isTrustedGitHubReleaseUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (!TRUSTED_RELEASE_HOSTS.has(host)) return false;
    if (host === 'github.com' || host === 'www.github.com') {
      return parsed.pathname.startsWith('/rickkwang/Gitick/releases/');
    }
    return true;
  } catch (_) {
    return false;
  }
};

module.exports = {
  ALLOWED_EXTERNAL_HOSTS,
  TRUSTED_RELEASE_HOSTS,
  RELEASE_METADATA_URL,
  isSafeExternalUrl,
  isTrustedGitHubReleaseUrl,
};
