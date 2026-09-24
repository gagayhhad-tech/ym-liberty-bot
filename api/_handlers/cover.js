module.exports = async function coverHandler(req, res) {
  const rawUrl = req.query?.url;
  if (!rawUrl) return res.status(400).send('Missing url parameter');

  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return res.status(400).send('Invalid image URL');
  }
  if (url.protocol !== 'https:') return res.status(400).send('Only HTTPS images are allowed');
  const allowedHosts = ['avatars.yandex.net', 'music.yandex.net', 'yandex.net', 'yandex.ru'];
  const isAllowedHost = (hostname) => allowedHosts.some(host =>
    hostname === host || hostname.endsWith(`.${host}`)
  );
  if (!isAllowedHost(url.hostname)) return res.status(403).send('Image host is not allowed');

  try {
    let upstream;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
      upstream = await fetch(url, {
        redirect: 'manual',
        headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(10000)
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get('location');
      if (!location || redirectCount === 3) return res.status(502).send('Too many cover redirects');
      url = new URL(location, url);
      if (url.protocol !== 'https:' || !isAllowedHost(url.hostname)) {
        return res.status(403).send('Cover redirect host is not allowed');
      }
    }
    if (!upstream.ok) return res.status(upstream.status).end();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return res.status(415).send('Not an image');
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) return res.status(413).send('Cover image is too large');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(bytes);
  } catch (_) {
    return res.status(502).send('Cover proxy failed');
  }
};
