const axios = require('axios');

module.exports = async function (req, res) {
  const { token, id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "No artist id provided" });
  }

  try {
    const headers = {
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    };
    if (token) headers['Authorization'] = `OAuth ${token}`;

    const response = await axios.get(`https://api.music.yandex.net/artists/${id}/brief-info`, {
      headers
    });

    const data = response.data;
    if (!data.result) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const artist = data.result.artist;
    const popularTracks = data.result.popularTracks || [];

    const getLibertyList = require('./libertyList');
    const libertyTracks = await getLibertyList();

    const tracks = popularTracks.map((t) => {
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
        track: t
      };
    });

    const rawAlbums = data.result.albums || [];
    const alsoAlbums = data.result.alsoAlbums || [];
    const mergedAlbums = [...rawAlbums, ...alsoAlbums];
    
    const uniqueAlbums = [];
    const albumIds = new Set();
    mergedAlbums.forEach(a => {
      if (!albumIds.has(a.id)) {
        uniqueAlbums.push(a);
        albumIds.add(a.id);
      }
    });

    const albums = uniqueAlbums.map(a => ({
      id: a.id,
      title: a.title,
      year: a.year,
      trackCount: a.trackCount,
      coverUri: a.coverUri ? "https://" + a.coverUri.replace("%%", "400x400") : ""
    }));

    const artistCover = artist.cover?.uri ? "https://" + artist.cover.uri.replace("%%", "1000x1000") : "";

    res.json({
      id: artist.id,
      name: artist.name,
      coverUri: artistCover,
      tracks: tracks,
      albums: albums
    });

  } catch (error) {
    console.error("Artist API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
