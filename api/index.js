const handlers = {
  version: require('./_handlers/version'),
  stream: require('./_handlers/stream'),
  library: require('./_handlers/library'),
  search: require('./_handlers/search'),
  artist: require('./_handlers/artist'),
  album: require('./_handlers/album'),
  playlist: require('./_handlers/playlist'),
  playlists: require('./_handlers/playlists'),
  'playlist-add': require('./_handlers/playlist-add'),
  like: require('./_handlers/like'),
  feedback: require('./_handlers/feedback'),
  popular: require('./_handlers/popular'),
  auth: require('./_handlers/auth'),
  'proxy-audio': require('./_handlers/proxy-audio'),
  proxy: require('./_handlers/proxy'),
  report: require('./_handlers/report'),
  bot: require('./_handlers/bot'),
  vibe: require('./_handlers/vibe'),
  test: require('./_handlers/test'),
  libertyList: require('./_handlers/libertyList'),
};

module.exports = async (req, res) => {
  let endpoint = '';
  if (req.query && req.query.path) {
    endpoint = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    delete req.query.path;
  }
  
  if (!endpoint && req.url) {
    const rawPath = req.url.split('?')[0];
    endpoint = rawPath.replace(/^\/api\/?/, '').replace(/\/$/, '');
  }

  if (!endpoint) {
    endpoint = 'version';
  }

  const handler = handlers[endpoint];
  if (!handler) {
    return res.status(404).json({ error: `Endpoint /api/${endpoint} not found` });
  }

  try {
    return await handler(req, res);
  } catch (err) {
    console.error(`Error in /api/${endpoint}:`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
};
