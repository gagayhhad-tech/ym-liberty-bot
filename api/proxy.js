export default async function handler(req, res) {
    const { url, debug } = req.query;
    
    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    const trackIdMatch = url.match(/\/tracks\/(\d+)/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;

    let debugInfo = { url, trackId, listOk: false, hasTrack: false, error: null };

    if (trackId) {
        try {
            const listUrl = "https://raw.githubusercontent.com/gagayhhad-tech/ym-liberty-db/refs/heads/main/list.json";
            const listRes = await fetch(listUrl);
            if (listRes.ok) {
                debugInfo.listOk = true;
                const json = await listRes.json();
                const list = json.tracks || json; // fallback in case structure changes
                
                if (list[trackId]) {
                    debugInfo.hasTrack = true;
                    const hfUrl = list[trackId];
                    let path = hfUrl;
                    try {
                        path = new URL(hfUrl).pathname;
                    } catch(e) {}
                    
                    const xml = `<?xml version="1.0" encoding="utf-8"?>
<download-info>
    <host>${req.headers.host}</host>
    <path>${path}</path>
    <ts>0</ts>
    <region>0</region>
    <s>0</s>
</download-info>`;
                    if (!debug) {
                        res.setHeader('Content-Type', 'application/xml');
                        return res.status(200).send(xml);
                    }
                }
            } else {
                debugInfo.error = "listRes not ok: " + listRes.status;
            }
        } catch (e) {
            debugInfo.error = e.toString();
        }
    }

    if (debug) {
        return res.status(200).json(debugInfo);
    }

    res.redirect(302, url);
}
