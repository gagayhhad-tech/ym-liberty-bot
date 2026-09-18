const axios = require('axios');

// Per-user listening counters (tracks + minutes), keyed by Yandex uid.
//
// GET  reads the stored counters for the verified user.
// POST merges them into the stored record so two devices cannot clobber each
// other: totals take the larger value, and the daily counters only take part
// when both sides agree on the date.
//
// Storage: Upstash Redis REST (Vercel KV is Upstash under the hood, so its
// env names are accepted too). Vercel serverless has no persistent disk, so
// the counters cannot live in a local file here. Configure ONE of these env
// pairs on the deployment:
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (Upstash)
//   KV_REST_API_URL       + KV_REST_API_TOKEN            (Vercel KV)
// Without them the endpoint answers 503 and the client keeps the counters
// on-device and shows the sync warning.
//
// NOTE: only the *REST* URL is accepted. Upstash also exposes KV_URL/REDIS_URL
// as rediss:// native endpoints — those are for a Redis wire client and would
// break an HTTP POST, so they are deliberately not used here.
function resolveKvUrl() {
  const candidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.KV_REST_API_URL
  ];
  return candidates.find(u => typeof u === 'string' && /^https?:\/\//i.test(u)) || null;
}
const KV_URL = resolveKvUrl();
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || null;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Resolve the verified Yandex uid from the OAuth token, mirroring the other
// handlers so the client cannot forge another user's stats key.
async function resolveUid(token) {
  const rawToken = String(token || '').replace(/^OAuth\s+/i, '').replace(/^Bearer\s+/i, '').trim();
  if (!rawToken) return null;
  const res = await axios.get('https://api.music.yandex.net/account/status', {
    headers: {
      'Authorization': `OAuth ${rawToken}`,
      'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231'
    },
    timeout: 10000
  });
  return res.data?.result?.account?.uid || null;
}

// Upstash command API: POST the Redis command as a JSON array.
async function kv(command) {
  const res = await axios.post(KV_URL, command, {
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    timeout: 10000
  });
  return res.data?.result;
}

function nonNegInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

module.exports = async function (req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({
      error: 'Stats storage not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or Vercel KV).'
    });
  }

  const token = req.query?.token || req.body?.token || req.headers?.authorization?.replace(/^OAuth\s+/i, '');

  let uid;
  try {
    uid = await resolveUid(token);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const key = `ymstats:${uid}`;
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const incoming = {
        totalTracks: nonNegInt(b.totalTracks),
        totalSeconds: nonNegInt(b.totalSeconds),
        todayTracks: nonNegInt(b.todayTracks),
        todaySeconds: nonNegInt(b.todaySeconds),
        date: typeof b.date === 'string' && b.date ? b.date : today
      };

      const raw = await kv(['GET', key]);
      let stored = {};
      if (raw) {
        try { stored = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (e) { stored = {}; }
      }

      // Lifetime counters only ever grow, so the larger side wins. The daily
      // counters are meaningless across days: adopt them only when both sides
      // are talking about the same date, otherwise start the day from zero.
      const merged = {
        totalTracks: Math.max(incoming.totalTracks, nonNegInt(stored.totalTracks)),
        totalSeconds: Math.max(incoming.totalSeconds, nonNegInt(stored.totalSeconds)),
        todayTracks: 0,
        todaySeconds: 0,
        date: today
      };
      if (incoming.date === today) {
        merged.todayTracks = incoming.todayTracks;
        merged.todaySeconds = incoming.todaySeconds;
      }
      if (stored.date === today) {
        merged.todayTracks = Math.max(merged.todayTracks, nonNegInt(stored.todayTracks));
        merged.todaySeconds = Math.max(merged.todaySeconds, nonNegInt(stored.todaySeconds));
      }
      merged.updatedAt = Date.now();

      await kv(['SET', key, JSON.stringify(merged)]);
      return res.json({ ok: true, ...merged });
    }

    const raw = await kv(['GET', key]);
    if (!raw) return res.json({});
    let data;
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { data = {}; }
    return res.json(data || {});
  } catch (e) {
    console.error('stats handler error:', e.response?.status, e.response?.data || e.message);
    return res.status(500).json({ error: 'Stats storage error' });
  }
};
