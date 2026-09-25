const axios = require('axios');

module.exports = async (req, res) => {
  const { trackId, format = 'LRC', durationMs = '0', timeStamp, sign } = req.query;
  const token = req.query.token || req.headers?.authorization?.replace(/^OAuth\s+/i, '');
  if (!trackId || !timeStamp || !sign || !token) {
    return res.status(400).json({ error: 'Missing lyrics parameters' });
  }

  const headers = {
    Authorization: `OAuth ${token}`,
    'X-Yandex-Music-Client': 'YandexMusicAndroid/24023621',
    Accept: 'application/json'
  };

  try {
    const response = await axios.get(
      `https://api.music.yandex.net/tracks/${encodeURIComponent(trackId)}/lyrics`,
      { params: { format, durationMs, timeStamp, sign }, headers, timeout: 8000 }
    );
    const result = response.data?.result || null;

    // Some Yandex responses return only a CDN document URL. Resolve it on the
    // server so the browser never has to make a second cross-origin request.
    const downloadUrl = result?.downloadUrl || result?.url;
    if (result && downloadUrl && !result.text && !result.lyrics && !result.fullLyrics) {
      try {
        const textResponse = await axios.get(downloadUrl, {
          headers: { Accept: 'text/plain,*/*' },
          timeout: 8000,
          responseType: 'text'
        });
        result.text = textResponse.data;
      } catch (_) {}
    }

    return res.status(response.status).json({ result });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};
