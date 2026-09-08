const axios = require('axios');
const getLibertyList = require('./libertyList');

module.exports = async function (req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const headers = {
      'Authorization': `OAuth ${token}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };

    const { queue, station } = req.query;
    const stationPath = station || 'user:onyourwave';
    const params = { settings2: 'true' };
    if (queue) {
      params.queue = queue;
    }

    const [response, libertyTracks] = await Promise.all([
      axios.get(`https://api.music.yandex.net/rotor/station/${stationPath}/tracks`, { headers, params }),
      getLibertyList()
    ]);

    const data = response.data;
    if (!data.result || !data.result.sequence) {
      return res.status(400).json({ error: "Invalid API response from Yandex Rotor" });
    }

    let tracks = data.result.sequence.filter(t => t.track && t.track.title !== "Музыкальное Upgrade");
    const isShadowbanned = tracks.length === 0 && data.result.sequence.length > 0;

    res.json({
      shadowbanned: isShadowbanned,
      tracks: tracks.map(t => {
        const tr = t.track;
        tr.isLiberty = Boolean(libertyTracks && libertyTracks[String(tr.id)]);
        return tr;
      }),
      batchId: data.result.batchId
    });

  } catch (error) {
    console.error("Vibe Fetch Error:", error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.message, data: error.response?.data });
  }
};
