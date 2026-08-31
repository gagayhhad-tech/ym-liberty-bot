const axios = require('axios');
const NodeID3 = require('node-id3');

const GITHUB_REPO = 'gagayhhad-tech/ym-liberty-db';
const GITHUB_BRANCH = 'main';

async function tgSend(token, chatId, text, options = {}) {
  const payload = { chat_id: chatId, text: text, ...options };
  const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, payload);
  return res.data;
}

async function tgEditMessage(token, chatId, messageId, text, options = {}) {
  const payload = { chat_id: chatId, message_id: messageId, text: text, ...options };
  await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, payload);
}

async function tgAnswerCallbackQuery(token, queryId, text) {
  await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { callback_query_id: queryId, text });
}

async function tgGetFileLink(token, fileId) {
  const res = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const filePath = res.data.result.file_path;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function githubPutFile(token, path, contentBase64, message, sha = null) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const data = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (sha) data.sha = sha;
  const res = await axios.put(url, data, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  return res.data;
}

async function githubGetFile(token, path) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const res = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    return res.data;
  } catch (e) {
    if (e.response && e.response.status === 404) return null;
    throw e;
  }
}

async function fetchListJson(ghToken) {
  let listData = {};
  let listSha = null;
  const listFile = await githubGetFile(ghToken, 'list.json');
  if (listFile) {
    listSha = listFile.sha;
    const content = Buffer.from(listFile.content, 'base64').toString('utf8');
    if (content.trim() !== '') listData = JSON.parse(content);
  }
  return { listData, listSha };
}

async function processFileUpload(token, ghToken, chatId, messageIdToEdit, trackId, fileId) {
  try {
    await tgEditMessage(token, chatId, messageIdToEdit, `⏳ Скачиваю файл для трека ${trackId} из Telegram...`);
    const fileLink = await tgGetFileLink(token, fileId);
    const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const base64Audio = Buffer.from(fileResponse.data, 'binary').toString('base64');
    
    await tgEditMessage(token, chatId, messageIdToEdit, '☁️ Загружаю аудиофайл на GitHub (это может занять время)...');
    const trackPath = `tracks/${trackId}.mp3`;
    const existingTrack = await githubGetFile(ghToken, trackPath);
    await githubPutFile(ghToken, trackPath, base64Audio, `add: трек ${trackId}`, existingTrack ? existingTrack.sha : null);
    
    await tgEditMessage(token, chatId, messageIdToEdit, '📝 Обновляю базу данных (list.json)...');
    const { listData, listSha } = await fetchListJson(ghToken);
    
    listData[trackId] = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${trackPath}`;
    const base64List = Buffer.from(JSON.stringify(listData, null, 2), 'utf8').toString('base64');
    
    await githubPutFile(ghToken, 'list.json', base64List, `update: добавлен трек ${trackId} в базу`, listSha);
    await tgEditMessage(token, chatId, messageIdToEdit, `🎉 Успешно! Файл привязан к треку ${trackId} в базе данных.`);
  } catch (err) {
    console.error(err);
    await tgEditMessage(token, chatId, messageIdToEdit, '❌ Ошибка: ' + err.message);
  }
}

module.exports = async (req, res) => {
  try {
    const { body } = req;
    const token = process.env.TELEGRAM_TOKEN;
    const ghToken = process.env.GITHUB_TOKEN;
    if (!token) return res.status(200).send('No token');
    
    // Auth check helper
    const isAuthorized = (userId) => {
      if (!process.env.ADMIN_IDS) return true;
      const allowedAdmins = process.env.ADMIN_IDS.split(',').map(id => id.trim());
      return allowedAdmins.includes(userId.toString());
    };

    // HANDLE CALLBACK QUERIES
    if (body.callback_query) {
      const query = body.callback_query;
      const chatId = query.message.chat.id;
      if (!isAuthorized(query.from.id)) return res.status(200).send('OK');

      const data = query.data;
      if (data.startsWith('CONFIRM_TRACK_')) {
        const trackId = data.replace('CONFIRM_TRACK_', '');
        await tgAnswerCallbackQuery(token, query.id, 'Начинаю загрузку...');
        
        // Find fileId from the original message that the bot replied to
        const origMsg = query.message.reply_to_message;
        if (!origMsg || (!origMsg.audio && !origMsg.document)) {
          await tgEditMessage(token, chatId, query.message.message_id, '❌ Ошибка: не найден оригинальный файл.');
          return res.status(200).send('OK');
        }
        
        const fileId = origMsg.audio ? origMsg.audio.file_id : origMsg.document.file_id;
        
        // Start background upload process (Vercel allows async execution after returning if configured, 
        // but for safety we await it, note Vercel limits execution time to 10s or 60s)
        await processFileUpload(token, ghToken, chatId, query.message.message_id, trackId, fileId);
      } 
      else if (data === 'CANCEL') {
        await tgEditMessage(token, chatId, query.message.message_id, '❌ Отменено.');
        await tgAnswerCallbackQuery(token, query.id, 'Отменено');
      }
      return res.status(200).send('OK');
    }
    
    // HANDLE MESSAGES
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      
      if (!isAuthorized(msg.from.id)) {
        await tgSend(token, chatId, 'Извини, бот приватный и работает только для администраторов.');
        return res.status(200).send('OK');
      }

      if (msg.text && msg.text.includes('music.yandex.ru')) {
        const trackMatch = msg.text.match(/track\/(\d+)/);
        if (trackMatch) {
          const trackId = trackMatch[1];
          // Check DB first
          const { listData } = await fetchListJson(ghToken);
          if (listData[trackId]) {
            await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
            return res.status(200).send('OK');
          }
          await tgSend(token, chatId, `✅ Найден Track ID: ${trackId}\nТеперь отправь мне MP3 файл, ответив на это сообщение.`, { reply_markup: { force_reply: true } });
        }
      } 
      else if (msg.audio || msg.document) {
        // Did they reply to a track ID message?
        if (msg.reply_to_message && msg.reply_to_message.text && msg.reply_to_message.text.includes('Track ID:')) {
          const trackIdMatch = msg.reply_to_message.text.match(/Track ID: (\d+)/);
          if (trackIdMatch) {
            const trackId = trackIdMatch[1];
            // Check DB
            const { listData } = await fetchListJson(ghToken);
            if (listData[trackId]) {
              await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
              return res.status(200).send('OK');
            }
            
            const fileId = msg.audio ? msg.audio.file_id : msg.document.file_id;
            const statusMsg = await tgSend(token, chatId, `⏳ Инициализация загрузки...`);
            await processFileUpload(token, ghToken, chatId, statusMsg.result.message_id, trackId, fileId);
          }
        } 
        else {
          // Direct MP3 upload without reply -> Try to read ID3 tags
          await tgSend(token, chatId, `⏳ Читаю ID3-теги файла...`);
          try {
            const fileId = msg.audio ? msg.audio.file_id : msg.document.file_id;
            const fileLink = await tgGetFileLink(token, fileId);
            
            // Download file partially or fully to read tags
            const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
            const tags = NodeID3.read(fileResponse.data);
            
            if (!tags.title) {
              await tgSend(token, chatId, '❌ Не удалось прочитать название трека из MP3. Скинь ссылку на трек из Яндекса, а затем ответь файлом.');
              return res.status(200).send('OK');
            }
            
            const searchQuery = `${tags.artist || ''} ${tags.title}`.trim();
            const yandexRes = await axios.get(`https://api.music.yandex.net/search?text=${encodeURIComponent(searchQuery)}&type=track`);
            const tracks = yandexRes.data.result?.tracks?.results;
            
            if (!tracks || tracks.length === 0) {
              await tgSend(token, chatId, `❌ Не нашел в Яндексе трек по запросу "${searchQuery}".`);
              return res.status(200).send('OK');
            }
            
            const bestMatch = tracks[0];
            const trackId = bestMatch.id;
            const trackTitle = bestMatch.title;
            const trackArtist = bestMatch.artists.map(a => a.name).join(', ');
            
            // Check DB
            const { listData } = await fetchListJson(ghToken);
            if (listData[trackId]) {
              await tgSend(token, chatId, `⚠️ Трек 🎵 ${trackArtist} - ${trackTitle} (ID: ${trackId}) уже есть в нашей базе!`);
              return res.status(200).send('OK');
            }
            
            await tgSend(token, chatId, `Нашел в Яндекс Музыке:\n🎵 **${trackArtist} - ${trackTitle}**\n*(ID: ${trackId})*\n\nЭто нужный трек?`, {
              parse_mode: 'Markdown',
              reply_to_message_id: msg.message_id,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Да, загрузить', callback_data: `CONFIRM_TRACK_${trackId}` }],
                  [{ text: '❌ Нет', callback_data: 'CANCEL' }]
                ]
              }
            });
            
          } catch (e) {
             console.error(e);
             await tgSend(token, chatId, '❌ Ошибка при обработке аудио: ' + e.message);
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
};
