const path = require('path');

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

  const safeEndpoint = path.basename(endpoint);

  try {
    const handlerPath = path.join(__dirname, '_handlers', `${safeEndpoint}.js`);
    const handler = require(handlerPath);
    return await handler(req, res);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return res.status(404).json({ error: `Endpoint /api/${safeEndpoint} not found` });
    }
    console.error(`Error in gateway /api/${safeEndpoint}:`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
};
