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
    const content = Buffer.from(listFile.content, 'base64').toString('utf8').replace(/^\uFEFF/, '');
    if (content.trim() !== '') listData = JSON.parse(content);
  }
  return { listData, listSha };
}

async function processFileUpload(token, ghToken, chatId, messageIdToEdit, trackId, fileId, metadataString = null) {
  try {
    await tgEditMessage(token, chatId, messageIdToEdit, `⏳ Скачиваю файл для трека ${trackId} из Telegram...`);
    const fileLink = await tgGetFileLink(token, fileId);
    const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(fileResponse.data);
    const base64Audio = audioBuffer.toString('base64');
    
    // Если метаданные не переданы из Яндекса, пытаемся достать их прямо из MP3 файла!
    if (!metadataString) {
      try {
        const tags = NodeID3.read(audioBuffer);
        if (tags && (tags.title || tags.artist)) {
          metadataString = `${tags.artist || 'Неизвестный исполнитель'} - ${tags.title || 'Без названия'}`;
        }
      } catch (e) {
        console.error("ID3 Parse Error:", e);
      }
    }
    
    if (!metadataString) metadataString = "Неизвестный трек";

    await tgEditMessage(token, chatId, messageIdToEdit, '☁️ Загружаю аудиофайл на GitHub (это может занять время)...');
    const trackPath = `tracks/${trackId}.mp3`;
    const existingTrack = await githubGetFile(ghToken, trackPath);
    await githubPutFile(ghToken, trackPath, base64Audio, `add: трек ${trackId}`, existingTrack ? existingTrack.sha : null);
    
    await tgEditMessage(token, chatId, messageIdToEdit, '📝 Обновляю базу данных (list.json)...');
    const { listData, listSha } = await fetchListJson(ghToken);
    
    listData[trackId] = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${trackPath}`;
    const base64List = Buffer.from(JSON.stringify(listData, null, 2), 'utf8').toString('base64');
    
    await githubPutFile(ghToken, 'list.json', base64List, `update: добавлен трек ${trackId} в базу`, listSha);
    
    await tgEditMessage(token, chatId, messageIdToEdit, `📖 Обновляю README.md... (${metadataString})`);
    let readmeSha = null;
    let readmeContent = '# Yandex Music Liberty DB\n\nБаза оригинальных (без цензуры) треков для мода Yandex Music.\n\n## Добавленные треки:\n';
    
    const readmeFile = await githubGetFile(ghToken, 'README.md');
    if (readmeFile) {
      readmeSha = readmeFile.sha;
      readmeContent = Buffer.from(readmeFile.content, 'base64').toString('utf8');
    }
    
    readmeContent += `\n- ${metadataString} \`(ID: ${trackId})\``;
    const base64Readme = Buffer.from(readmeContent, 'utf8').toString('base64');
    await githubPutFile(ghToken, 'README.md', base64Readme, `docs: добавлен трек ${trackId} в README`, readmeSha);
    
    await tgEditMessage(token, chatId, messageIdToEdit, `🎉 Успешно! Файл привязан к треку ${trackId} в базе данных.\nДобавлено как: ${metadataString}`);
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
    
    const isAuthorized = (userId) => {
      if (!process.env.ADMIN_IDS) return true;
      const allowedAdmins = process.env.ADMIN_IDS.split(',').map(id => id.trim());
      return allowedAdmins.includes(userId.toString());
    };

    if (body.callback_query) {
      // ... (отключено из-за геоблока)
      return res.status(200).send('OK');
    }
    
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
          const { listData } = await fetchListJson(ghToken);
          if (listData[trackId]) {
            await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
            return res.status(200).send('OK');
          }
          await tgSend(token, chatId, `✅ Найден Track ID: ${trackId}\nТеперь отправь мне MP3 файл, ответив на это сообщение.`, { reply_markup: { force_reply: true } });
        }
      } 
      else if (msg.audio || msg.document) {
        if (msg.reply_to_message && msg.reply_to_message.text && msg.reply_to_message.text.includes('Track ID:')) {
          const trackIdMatch = msg.reply_to_message.text.match(/Track ID: (\d+)/);
          if (trackIdMatch) {
            const trackId = trackIdMatch[1];
            const { listData } = await fetchListJson(ghToken);
            if (listData[trackId]) {
              await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
              return res.status(200).send('OK');
            }
            
            const fileId = msg.audio ? msg.audio.file_id : msg.document.file_id;
            const statusMsg = await tgSend(token, chatId, `⏳ Инициализация загрузки...`);
            await processFileUpload(token, ghToken, chatId, statusMsg.result.message_id, trackId, fileId, null);
          }
        } 
        else {
            await tgSend(token, chatId, '⚠️ Чтобы добавить трек, скинь прямую ссылку из Яндекса, а затем ответь файлом!');
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
};
