const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const GITHUB_REPO = 'gagayhhad-tech/ym-liberty-db';
const GITHUB_BRANCH = 'main';

async function githubPutFile(token, path, contentBase64, message, sha = null) {
  const url = \https://api.github.com/repos/\/contents/\\;
  const data = {
    message: message,
    content: contentBase64,
    branch: GITHUB_BRANCH
  };
  if (sha) data.sha = sha;

  const res = await axios.put(url, data, {
    headers: {
      'Authorization': \Bearer \\,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  return res.data;
}

async function githubGetFile(token, path) {
  try {
    const url = \https://api.github.com/repos/\/contents/\?ref=\\;
    const res = await axios.get(url, {
      headers: {
        'Authorization': \Bearer \\,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return res.data;
  } catch (e) {
    if (e.response && e.response.status === 404) return null;
    throw e;
  }
}

module.exports = async (req, res) => {
  try {
    const { body } = req;
    const token = process.env.TELEGRAM_TOKEN;
    const ghToken = process.env.GITHUB_TOKEN;
    if (!token) return res.status(200).send('No token');
    
    const bot = new TelegramBot(token, { polling: false });
    
    if (body && body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      
      if (process.env.ADMIN_IDS) {
        const allowedAdmins = process.env.ADMIN_IDS.split(',').map(id => id.trim());
        if (!allowedAdmins.includes(msg.from.id.toString())) {
          await bot.sendMessage(chatId, 'Извини, бот приватный и работает только для администраторов.');
          return res.status(200).send('OK');
        }
      }

      if (msg.text && msg.text.includes('music.yandex.ru')) {
        const trackMatch = msg.text.match(/track\/(\d+)/);
        if (trackMatch) {
          await bot.sendMessage(chatId, \✅ Найден Track ID: \\nТеперь отправь мне MP3 файл (как аудио или как документ), ответив на это сообщение.\, {
            reply_markup: { force_reply: true }
          });
        }
      } else if (msg.audio || msg.document) {
        if (msg.reply_to_message && msg.reply_to_message.text && msg.reply_to_message.text.includes('Track ID:')) {
          const trackIdMatch = msg.reply_to_message.text.match(/Track ID: (\d+)/);
          if (trackIdMatch) {
            const trackId = trackIdMatch[1];
            await bot.sendMessage(chatId, \⏳ Скачиваю файл для трека \ из Telegram...\);
            
            try {
              const fileId = msg.audio ? msg.audio.file_id : msg.document.file_id;
              const fileLink = await bot.getFileLink(fileId);
              
              // 1. Download file from telegram
              const fileResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
              const base64Audio = Buffer.from(fileResponse.data, 'binary').toString('base64');
              
              await bot.sendMessage(chatId, '☁️ Загружаю аудиофайл на GitHub...');
              // 2. Upload to Github tracks/
              const trackPath = \	racks/\.mp3\;
              const existingTrack = await githubGetFile(ghToken, trackPath);
              await githubPutFile(ghToken, trackPath, base64Audio, \dd: трек \\, existingTrack ? existingTrack.sha : null);
              
              await bot.sendMessage(chatId, '📝 Обновляю базу данных (list.json)...');
              // 3. Update list.json
              let listData = {};
              let listSha = null;
              const listFile = await githubGetFile(ghToken, 'list.json');
              if (listFile) {
                listSha = listFile.sha;
                const content = Buffer.from(listFile.content, 'base64').toString('utf8');
                if (content.trim() !== '') {
                  listData = JSON.parse(content);
                }
              }
              
              listData[trackId] = \https://raw.githubusercontent.com/\/\/\\;
              const base64List = Buffer.from(JSON.stringify(listData, null, 2), 'utf8').toString('base64');
              
              await githubPutFile(ghToken, 'list.json', base64List, \update: добавлен трек \ в базу\, listSha);
              
              await bot.sendMessage(chatId, \🎉 Успешно! Файл привязан к треку \ в базе данных.\);
            } catch (err) {
              console.error(err);
              await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке: ' + err.message);
            }
          }
        } else {
            await bot.sendMessage(chatId, 'Чтобы добавить трек, сначала отправь ссылку на него, а затем **ответь (Reply)** на мое сообщение с MP3-файлом.');
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send(error.toString());
  }
};
