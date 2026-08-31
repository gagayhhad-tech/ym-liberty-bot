const axios = require('axios');
const NodeID3 = require('node-id3');
const { commit } = require('@huggingface/hub');

const GITHUB_REPO = 'gagayhhad-tech/ym-liberty-db';
const GITHUB_BRANCH = 'main';
const HF_DATASET = 'naloz/YMliberty';

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

async function fetchJsonFile(ghToken, path, defaultVal) {
  const file = await githubGetFile(ghToken, path);
  if (file) {
    const content = Buffer.from(file.content, 'base64').toString('utf8').replace(/^\uFEFF/, '');
    if (content.trim() !== '') return { data: JSON.parse(content), sha: file.sha };
  }
  return { data: defaultVal, sha: null };
}

async function processFileUpload(token, ghToken, hfToken, chatId, messageIdToEdit, trackId, fileId, metadataString = null) {
  try {
    await tgEditMessage(token, chatId, messageIdToEdit, `⏳ Скачиваю файл для трека ${trackId} из Telegram...`);
    const fileLink = await tgGetFileLink(token, fileId);
    const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(fileResponse.data);
    
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

    await tgEditMessage(token, chatId, messageIdToEdit, '☁️ Загружаю аудиофайл в Hugging Face Dataset...');
    const trackPath = `tracks/${trackId}.mp3`;
    
    await commit({
      credentials: { accessToken: hfToken },
      repo: { type: 'dataset', name: HF_DATASET },
      operations: [
        {
          operation: 'addOrUpdate',
          path: trackPath,
          content: new Blob([audioBuffer])
        }
      ],
      title: `Add track ${trackId}`
    });
    
    await tgEditMessage(token, chatId, messageIdToEdit, '📝 Обновляю базу данных (list.json) на GitHub...');
    const { data: listData, sha: listSha } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
    if (!listData.tracks) listData.tracks = {};
    
    listData.tracks[trackId] = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main/${trackPath}`;
    const base64List = Buffer.from(JSON.stringify(listData, null, 2), 'utf8').toString('base64');
    await githubPutFile(ghToken, 'list.json', base64List, `update: загружен трек ${trackId}`, listSha);
    
    await tgEditMessage(token, chatId, messageIdToEdit, `📖 Обновляю README.md... (${metadataString})`);
    let readmeSha = null;
    let readmeContent = '# Yandex Music Liberty DB\n\nБаза оригинальных (без цензуры) треков для мода Yandex Music.\n\n## Добавленные треки:\n';
    
    const readmeFile = await githubGetFile(ghToken, 'README.md');
    if (readmeFile) {
      readmeSha = readmeFile.sha;
      readmeContent = Buffer.from(readmeFile.content, 'base64').toString('utf8');
    }
    
    // Удаляем старую запись, если она была (для функции ЗАМЕНЫ)
    readmeContent = readmeContent.split('\n').filter(line => !line.includes(`(ID: ${trackId})`)).join('\n');
    readmeContent += `\n- ${metadataString} \`(ID: ${trackId})\``;
    
    const base64Readme = Buffer.from(readmeContent, 'utf8').toString('base64');
    await githubPutFile(ghToken, 'README.md', base64Readme, `docs: добавлен/обновлен трек ${trackId}`, readmeSha);
    
    // Авто-очистка трека из списка репортов
    try {
        const { data: reports, sha: reportsSha } = await fetchJsonFile(ghToken, 'reports.json', []);
        if (reports.includes(trackId)) {
            const newReports = reports.filter(id => id !== trackId);
            const b64Reports = Buffer.from(JSON.stringify(newReports, null, 2)).toString('base64');
            await githubPutFile(ghToken, 'reports.json', b64Reports, `chore: удален ${trackId} из репортов после успешной загрузки`, reportsSha);
        }
    } catch(e) { console.error("Не удалось очистить репорт:", e) }

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
    const hfToken = process.env.HF_TOKEN;
    if (!token) return res.status(200).send('No token');
    
    const isAuthorized = (userId) => {
      if (!process.env.ADMIN_IDS) return true;
      const allowedAdmins = process.env.ADMIN_IDS.split(',').map(id => id.trim());
      return allowedAdmins.includes(userId.toString());
    };

    // 1. Прием репортов из мода (без авторизации)
    if (body.type === 'report' && body.track_id) {
      const trackId = body.track_id.toString();
      const { data: listData } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
      if (listData.tracks && listData.tracks[trackId]) {
         return res.status(200).send({ status: 'already_exists' });
      }
      
      const { data: reports, sha: reportsSha } = await fetchJsonFile(ghToken, 'reports.json', []);
      if (!reports.includes(trackId)) {
         reports.push(trackId);
         const b64 = Buffer.from(JSON.stringify(reports, null, 2)).toString('base64');
         await githubPutFile(ghToken, 'reports.json', b64, `report: жалоба на цензуру трека ${trackId}`, reportsSha);
         
         // Отправляем уведомление с КНОПКОЙ ДОБАВЛЕНИЯ
         if (process.env.ADMIN_IDS) {
            const admins = process.env.ADMIN_IDS.split(',').map(id => id.trim());
            for (const adminId of admins) {
               try { 
                 await tgSend(token, adminId, `🚨 Новый репорт от пользователя!\nТрек зацензурен: https://music.yandex.ru/track/${trackId}`, {
                    reply_markup: {
                        inline_keyboard: [[{ text: '➕ Добавить трек', callback_data: `ADD_TRACK_${trackId}` }]]
                    }
                 });
               } catch(e){}
            }
         }
      }
      return res.status(200).send({ status: 'reported' });
    }

    if (body.callback_query) {
      const query = body.callback_query;
      const chatId = query.message.chat.id;
      if (!isAuthorized(query.from.id)) return res.status(200).send('OK');
      const data = query.data;

      if (data.startsWith('ADD_TRACK_')) {
         const trackId = data.replace('ADD_TRACK_', '');
         await tgAnswerCallbackQuery(token, query.id, 'Жду файл...');
         await tgSend(token, chatId, `✅ Заявка на Track ID: ${trackId}\nТеперь отправь мне MP3 файл, ответив на ЭТО сообщение.`, { reply_markup: { force_reply: true } });
      }
      else if (data === 'CLEAR_REPORTS') {
         await tgAnswerCallbackQuery(token, query.id, 'Очищаю...');
         const { sha } = await fetchJsonFile(ghToken, 'reports.json', []);
         if (sha) {
            const b64 = Buffer.from('[]').toString('base64');
            await githubPutFile(ghToken, 'reports.json', b64, 'chore: список репортов очищен', sha);
         }
         await tgEditMessage(token, chatId, query.message.message_id, '✅ Список репортов очищен!');
      }

      return res.status(200).send('OK');
    }
    
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      
      if (!isAuthorized(msg.from.id)) return res.status(200).send('OK');

      const MAIN_KEYBOARD = {
        keyboard: [
          [{ text: '📚 Существующие треки' }],
          [{ text: '🗑 Удаление треков' }, { text: '🔄 Замена трека' }],
          [{ text: '🚨 Сообщения о цензуре' }]
        ],
        resize_keyboard: true,
        is_persistent: true
      };

      if (msg.text && (msg.text === '/start' || msg.text === '/menu')) {
         await tgSend(token, chatId, '🎛 **Панель управления базой YM Liberty**\nКнопки меню теперь всегда внизу экрана!', {
            parse_mode: 'Markdown',
            reply_markup: MAIN_KEYBOARD
         });
         return res.status(200).send('OK');
      }

      // Обработка текстовых кнопок (Reply Keyboard)
      if (msg.text === '📚 Существующие треки') {
         const statusMsg = await tgSend(token, chatId, '⏳ Получаю список...');
         const { data: listData } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
         const count = Object.keys(listData.tracks || {}).length;
         await tgEditMessage(token, chatId, statusMsg.result.message_id, `📚 В базе сейчас **${count}** треков.\n\nПосмотреть полный список с названиями можно тут:\nhttps://github.com/${GITHUB_REPO}#readme`, { parse_mode: 'Markdown' });
         return res.status(200).send('OK');
      }
      if (msg.text === '🗑 Удаление треков') {
         await tgSend(token, chatId, '🗑 Ответь на это сообщение ссылкой на трек или его ID, чтобы УДАЛИТЬ его из базы.', { reply_markup: { force_reply: true } });
         return res.status(200).send('OK');
      }
      if (msg.text === '🔄 Замена трека') {
         await tgSend(token, chatId, '🔄 Ответь на это сообщение ссылкой на трек, чтобы ЗАМЕНИТЬ его (защита от дубликатов будет проигнорирована).', { reply_markup: { force_reply: true } });
         return res.status(200).send('OK');
      }
      if (msg.text === '🚨 Сообщения о цензуре') {
         const statusMsg = await tgSend(token, chatId, '⏳ Загружаю репорты...');
         const { data: reports } = await fetchJsonFile(ghToken, 'reports.json', []);
         if (reports.length === 0) {
            await tgEditMessage(token, chatId, statusMsg.result.message_id, '✅ Пока нет новых сообщений о цензуре!');
         } else {
            const lines = reports.map(id => `- https://music.yandex.ru/track/${id}`).join('\n');
            await tgEditMessage(token, chatId, statusMsg.result.message_id, `🚨 **Треки, ожидающие загрузки:**\n${lines}\n\nЧтобы очистить список, нажми кнопку ниже.`, { 
               parse_mode: 'Markdown',
               reply_markup: { inline_keyboard: [[{ text: '🧹 Очистить репорты', callback_data: 'CLEAR_REPORTS' }]] }
            });
         }
         return res.status(200).send('OK');
      }

      // Обработка ответов на меню (Удаление / Замена / Добавление MP3)
      if (msg.reply_to_message && msg.reply_to_message.text) {
         const replyText = msg.reply_to_message.text;

         // Обработка УДАЛЕНИЯ
         if (replyText.includes('чтобы УДАЛИТЬ его из базы')) {
            const trackMatch = msg.text.match(/track\/(\d+)/) || msg.text.match(/^(\d+)$/);
            if (!trackMatch) {
               await tgSend(token, chatId, '❌ Не смог найти Track ID в твоем сообщении.');
               return res.status(200).send('OK');
            }
            const trackId = trackMatch[1];
            const statusMsg = await tgSend(token, chatId, `⏳ Удаляю трек ${trackId}...`);
            
            const { data: listData, sha: listSha } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
            if (listData.tracks && listData.tracks[trackId]) {
               delete listData.tracks[trackId];
               const base64List = Buffer.from(JSON.stringify(listData, null, 2), 'utf8').toString('base64');
               await githubPutFile(ghToken, 'list.json', base64List, `delete: удален трек ${trackId}`, listSha);
            }

            const readmeFile = await githubGetFile(ghToken, 'README.md');
            if (readmeFile) {
               let readmeContent = Buffer.from(readmeFile.content, 'base64').toString('utf8');
               readmeContent = readmeContent.split('\n').filter(line => !line.includes(`(ID: ${trackId})`)).join('\n');
               const base64Readme = Buffer.from(readmeContent, 'utf8').toString('base64');
               await githubPutFile(ghToken, 'README.md', base64Readme, `docs: удален трек ${trackId}`, readmeFile.sha);
            }
            await tgEditMessage(token, chatId, statusMsg.result.message_id, `✅ Трек ${trackId} успешно удален из базы и README!`);
            return res.status(200).send('OK');
         }

         // Обработка подготовки ЗАМЕНЫ
         if (replyText.includes('чтобы ЗАМЕНИТЬ его')) {
            const trackMatch = msg.text.match(/track\/(\d+)/) || msg.text.match(/^(\d+)$/);
            if (!trackMatch) return res.status(200).send('OK');
            const trackId = trackMatch[1];
            await tgSend(token, chatId, `🔄 ЗАМЕНА Track ID: ${trackId}\nОтправь мне новый MP3 файл для этого трека, ответив на ЭТО сообщение.`, { reply_markup: { force_reply: true } });
            return res.status(200).send('OK');
         }

         // Обработка получения MP3 файла (Добавление / Замена / Репорт)
         if (msg.audio || msg.document) {
            if (replyText.includes('Track ID:')) {
               const isReplace = replyText.includes('ЗАМЕНА');
               const trackIdMatch = replyText.match(/Track ID: (\d+)/);
               if (trackIdMatch) {
                  if (!hfToken) {
                     await tgSend(token, chatId, '❌ Ошибка: Не настроен HF_TOKEN в Vercel!');
                     return res.status(200).send('OK');
                  }
                  const trackId = trackIdMatch[1];
                  
                  if (!isReplace) {
                     const { data: listData } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
                     if (listData.tracks && listData.tracks[trackId]) {
                        await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
                        return res.status(200).send('OK');
                     }
                  }
                  
                  let metadataString = null;
                  const metaMatch = replyText.match(/Track ID: \d+ \((.+)\)/);
                  if (metaMatch) metadataString = metaMatch[1];
                  
                  const fileId = msg.audio ? msg.audio.file_id : msg.document.file_id;
                  const statusMsg = await tgSend(token, chatId, `⏳ Инициализация загрузки (Hugging Face)...`);
                  await processFileUpload(token, ghToken, hfToken, chatId, statusMsg.result.message_id, trackId, fileId, metadataString);
               }
            }
         }
      }
      // Обычная отправка ссылки (Добавление)
      else if (msg.text && msg.text.includes('music.yandex.ru')) {
        const trackMatch = msg.text.match(/track\/(\d+)/);
        if (trackMatch) {
          const trackId = trackMatch[1];
          const { data: listData } = await fetchJsonFile(ghToken, 'list.json', { tracks: {} });
          if (listData.tracks && listData.tracks[trackId]) {
            await tgSend(token, chatId, `⚠️ Этот трек (ID: ${trackId}) уже есть в базе!`);
            return res.status(200).send('OK');
          }
          
          let trackMeta = '';
          try {
             const yandexRes = await axios.get(`https://api.music.yandex.net/tracks/${trackId}`, {
               headers: { 'User-Agent': 'YandexMusicAndroid/5.36.2 (Android 13)' }
             });
             if (yandexRes.data.result && yandexRes.data.result.length > 0) {
               const tr = yandexRes.data.result[0];
               const trArtist = tr.artists.map(a => a.name).join(', ');
               trackMeta = ` (${trArtist} - ${tr.title})`;
             }
          } catch (e) {}
          
          await tgSend(token, chatId, `✅ Найден Track ID: ${trackId}${trackMeta}\nТеперь отправь мне MP3 файл, ответив на это сообщение.`, { reply_markup: { force_reply: true } });
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
};
