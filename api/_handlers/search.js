const axios = require('axios');
const getLibertyList = require('./libertyList');

module.exports = async function (req, res) {
  const { token, query } = req.query;

  if (!token || !query) {
    return res.status(400).json({ error: "No token or query provided" });
  }

  try {
    const [response, libertyTracks] = await Promise.all([
      axios.get(`https://api.music.yandex.net/search?text=${encodeURIComponent(query)}&type=all&page=0&nococrrect=false`, {
        headers: {
          'Authorization': `OAuth ${token}`,
          'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
        }
      }),
      getLibertyList()
    ]);

    const data = response.data;

    let tracks = [];
    if (data.result && data.result.tracks && data.result.tracks.results) {
      tracks = data.result.tracks.results.map((t) => {
        const cover = t.coverUri
          ? "https://" + t.coverUri.replace("%%", "400x400")
          : t.albums?.[0]?.coverUri
          ? "https://" + t.albums[0].coverUri.replace("%%", "400x400")
          : "";

        return {
          id: t.id,
          title: t.title,
          version: t.version || "",
          artists: (t.artists || []).map((a) => a.name).join(", "),
          durationMs: t.durationMs || 0,
          coverUri: cover,
          explicit: Boolean(t.contentWarning === "explicit" || t.explicit),
          isLiberty: Boolean(libertyTracks && libertyTracks[String(t.id)]),
          track: t // full track object for queue
        };
      });
    }

    let artists = [];
    if (data.result && data.result.artists && data.result.artists.results) {
      artists = data.result.artists.results.map(a => {
        const cover = a.cover?.uri ? "https://" + a.cover.uri.replace("%%", "400x400") : "";
        return {
          id: a.id,
          name: a.name,
          coverUri: cover
        };
      });
    }

    res.json({ tracks, artists });

  } catch (error) {
    console.error("Search API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
