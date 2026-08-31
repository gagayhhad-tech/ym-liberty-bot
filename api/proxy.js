export default async function handler(req, res) {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    // Извлекаем trackId из URL (например: .../tracks/12345/...)
    const trackIdMatch = url.match(/\/tracks\/(\d+)\//);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;

    if (trackId) {
        try {
            // Проверяем, есть ли трек в базе
            const baseUrl = `https://${req.headers.host}`;
            const listRes = await fetch(`${baseUrl}/list.json`);
            if (listRes.ok) {
                const list = await listRes.json();
                
                // Если трек в нашей базе YM Liberty - отдаем фейковый XML
                if (list.includes(Number(trackId))) {
                    const xml = `<?xml version="1.0" encoding="utf-8"?>
<download-info>
    <host>${req.headers.host}</host>
    <path>/datasets/naloz/YMliberty/resolve/main/music/${trackId}.mp3</path>
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

    // Если трека нет в базе или произошла ошибка - просто редиректим на оригинальный URL Яндекса!
    res.redirect(302, url);
}
