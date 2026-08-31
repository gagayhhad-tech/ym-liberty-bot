export default async function handler(req, res) {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    const trackIdMatch = url.match(/\/tracks\/(\d+)/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;

    if (trackId) {
        try {
            const baseUrl = `https://${req.headers.host}`;
            const listRes = await fetch(`${baseUrl}/list.json`);
            if (listRes.ok) {
                const list = await listRes.json();
                
                // list is an object: {"12345": "https://huggingface.co/...", ...}
                if (list[trackId]) {
                    const hfUrl = list[trackId];
                    // Example: https://huggingface.co/datasets/naloz/YMliberty/resolve/main/tracks/12345.mp3
                    // We need the path after the host
                    let path = hfUrl;
                    try {
                        path = new URL(hfUrl).pathname; // /datasets/naloz/YMliberty/resolve/main/tracks/12345.mp3
                    } catch(e) {}
                    
                    const xml = `<?xml version="1.0" encoding="utf-8"?>
<download-info>
    <host>${req.headers.host}</host>
    <path>${path}</path>
    <ts>0</ts>
    <region>0</region>
    <s>0</s>
</download-info>`;
                    res.setHeader('Content-Type', 'application/xml');
                    return res.status(200).send(xml);
                }
            }
        } catch (e) {
            console.error("Error fetching list:", e);
        }
    }

    res.redirect(302, url);
}
