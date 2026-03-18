const { isSafeExternalUrl, isTrustedGitHubReleaseUrl } = require('../../electron/externalUrl.cjs');

describe('externalUrl allowlist', () => {
  it('allows https github urls', () => {
    expect(isSafeExternalUrl('https://github.com/rickkwang/Gitick')).toBe(true);
    expect(isSafeExternalUrl('https://www.github.com/rickkwang/Gitick/releases')).toBe(true);
  });

  it('rejects non-https protocols', () => {
    expect(isSafeExternalUrl('http://github.com/rickkwang/Gitick')).toBe(false);
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects untrusted hosts and invalid urls', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(false);
    expect(isSafeExternalUrl('not-a-url')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
  });
});

describe('github release url trust', () => {
  it('allows official GitHub release paths', () => {
    expect(isTrustedGitHubReleaseUrl('https://github.com/rickkwang/Gitick/releases/latest/download/latest-mac.yml')).toBe(true);
    expect(isTrustedGitHubReleaseUrl('https://www.github.com/rickkwang/Gitick/releases/download/v1.0.0/Gitick-1.0.0-arm64.zip')).toBe(true);
  });

  it('allows trusted release redirect hosts over https', () => {
    expect(isTrustedGitHubReleaseUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/abc')).toBe(true);
    expect(isTrustedGitHubReleaseUrl('https://github-releases.githubusercontent.com/asset?id=123')).toBe(true);
  });

  it('rejects non-release or untrusted urls', () => {
    expect(isTrustedGitHubReleaseUrl('https://github.com/rickkwang/Gitick')).toBe(false);
    expect(isTrustedGitHubReleaseUrl('https://example.com/rickkwang/Gitick/releases/download/v1/file.zip')).toBe(false);
    expect(isTrustedGitHubReleaseUrl('http://objects.githubusercontent.com/abc')).toBe(false);
  });
});
