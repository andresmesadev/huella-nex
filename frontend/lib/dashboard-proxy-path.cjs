function dashboardBackendUrl(base, segments) {
  if (!Array.isArray(segments) || !segments.length || segments.some(s => typeof s !== 'string' || !s || s === '.' || s === '..' || /[\\/%?#\x00-\x1f]/.test(s))) throw new Error('INVALID_PROXY_PATH');
  const url = new URL(base.replace(/\/$/, '') + '/api/dashboard/' + segments.map(encodeURIComponent).join('/'));
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/api/dashboard/')) throw new Error('INVALID_PROXY_PATH');
  return url;
}
module.exports = { dashboardBackendUrl };
