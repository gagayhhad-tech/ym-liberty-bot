const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const { body } = req;
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) return res.status(200).send('No token');
    
    const bot = new TelegramBot(token, { polling: false });
    
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      
      if (process.env.ADMIN_ID && msg.from.id.toString() !== process.env.ADMIN_ID) {
        await bot.sendMessage(chatId, 'Извини, бот приватный.');
        return res.status(200).send('OK');
      }

      if (msg.text && msg.text.includes('music.yandex.ru')) {
        const trackMatch = msg.text.match(/track\/(\d+)/);
        if (trackMatch) {
          await bot.sendMessage(chatId, \✅ Найден Track ID: \\nТеперь отправь мне MP3 файл (как аудио или файл), ответив на это сообщение.\);
        }
      } else if (msg.audio || msg.document) {
        if (msg.reply_to_message && msg.reply_to_message.text.includes('Track ID:')) {
          const trackIdMatch = msg.reply_to_message.text.match(/Track ID: (\d+)/);
          if (trackIdMatch) {
            await bot.sendMessage(chatId, '⚙️ Эта функция пока в разработке. Файл принят для ' + trackIdMatch[1]);
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
