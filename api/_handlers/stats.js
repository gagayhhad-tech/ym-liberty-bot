// Per-user listening counters (tracks + minutes), keyed by Yandex uid.
//
// GET  reads the stored counters for a uid.
// POST merges them into the stored record so two devices cannot clobber each
// other: totals take the larger value, and the daily counters only take part
// when both sides agree on the date.
//
// IMPORTANT: this endpoint never calls the Yandex API. Yandex rejects requests
// from datacenter IPs (this project runs on Vercel in fra1), which is exactly
// why the client talks to Yandex directly from the user's device. So the uid is
// supplied by the client, which resolves it device-side via account/status.
// The tradeoff: the server cannot prove the caller owns that uid, so counters
// are forgeable. They are listening tallies — no credentials and nothing
// private — so that is an acceptable cost for a working sync.
//
// Storage: Upstash Redis REST (Vercel KV is Upstash under the hood, so its env
// names are accepted too). Vercel serverless has no persistent disk, so the
// counters cannot live in a local file here. Configure ONE of these env pairs:
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

// Upstash command API: POST the Redis command as a JSON array.
async function kv(command) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error('KV HTTP ' + res.status);
  const data = await res.json();
  return data?.result;
}

function nonNegInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

// Yandex uids are numeric. Rejecting anything else keeps the key namespace
// clean and stops a caller from smuggling a Redis key separator through it.
function sanitizeUid(v) {
  const s = String(v ?? '').trim();
  return /^\d{1,20}$/.test(s) ? s : null;
}

module.exports = async function (req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({
      error: 'Stats storage not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or Vercel KV).'
    });
  }

  const uid = sanitizeUid(req.query?.uid ?? req.body?.uid);
  if (!uid) {
    return res.status(400).json({ error: 'Missing or invalid uid' });
  }

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
        date: typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : today
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
    console.error('stats handler error:', e.message);
    return res.status(500).json({ error: 'Stats storage error' });
  }
};
