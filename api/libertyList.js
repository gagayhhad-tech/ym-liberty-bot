const axios = require('axios');

let cachedList = null;
let lastCacheTime = 0;

async function getLibertyList() {
  const now = Date.now();
  if (cachedList && now - lastCacheTime < 60000) {
    return cachedList;
  }
  const urls = [
    "https://cdn.jsdelivr.net/gh/gagayhhad-tech/ym-liberty-db@main/list.json",
    "https://raw.githubusercontent.com/gagayhhad-tech/ym-liberty-db/refs/heads/main/list.json"
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 4000 });
      cachedList = res.data && res.data.tracks ? res.data.tracks : res.data;
      lastCacheTime = now;
      return cachedList;
    } catch (e) {
      // try next
    }
  }
  return cachedList || {};
}

module.exports = getLibertyList;
