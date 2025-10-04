// voices_bot_telegraf.js
// Telegraf v4 bot for Telegram implementing the "Voices" flow with only Telegraf.
// After user finishes flow, all collected data is sent to a specific admin chat.

require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // set in .env

if (!BOT_TOKEN) {
  console.error('Please set TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}
if (!ADMIN_CHAT_ID) {
  console.error('Please set ADMIN_CHAT_ID in .env');
  process.exit(1);
}

// Валидация chat_id
function isValidChatId(chatId) {
  if (!chatId) return false;
  const id = chatId.toString();
  // Проверяем формат: должен начинаться с -100 для супергрупп или быть числом для личных чатов
  return /^-100\d+$/.test(id) || /^\d+$/.test(id);
}

if (!isValidChatId(ADMIN_CHAT_ID)) {
  console.error('Invalid ADMIN_CHAT_ID format. Should be a valid Telegram chat ID.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Keyboards / Buttons
const kbStart = Markup.inlineKeyboard([
  [Markup.button.callback('Хочу рассказать', 'I_WANT_TO_TELL')],
  [Markup.button.callback('Хочу узнать больше', 'I_WANT_TO_LEARN')],
]);

const kbLearn = Markup.inlineKeyboard([[Markup.button.callback('Да, давайте', 'LETS_START')]]);

const kbContactYesNo = Markup.inlineKeyboard([
  [Markup.button.callback('Оставить контакт', 'LEAVE_CONTACT')],
  [Markup.button.callback('Нет, спасибо', 'NO_CONTACT')],
]);

const kbFinal = Markup.inlineKeyboard([
  [Markup.button.callback('Записать ещё одно', 'RECORD_MORE')],
  [Markup.button.callback('Завершить', 'FINISH')],
]);

// Start message
bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply('Привет! Это бот проекта «Voices» @voices_mag.\n\nМы собираем голосовые истории про то, как меняемся мы и мир вокруг с 2022 года.\n\nПравильных ответов нет.\nДостаточно говорить искренне.\n\nГотовы поделиться своей историей? 🎙️', kbStart);
});

// Handler for the "Хочу узнать больше" flow
bot.action('I_WANT_TO_LEARN', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  await ctx.reply(`Voices — это документальный веб-зин.\nМы собираем анонимные голосовые сообщения от русскоязычных людей из разных стран, чтобы услышать, как звучит этот мир в момент перемен.\nЭто сайт с интерактивной картой.\nКаждое сообщение — это точка на карте. И голос за ней.\nГолос человека, который что-то переживает. Как и мы все.\nМы надеемся, что этот проект даст возможность:\n — высказаться о том, что чувствуешь\n — услышать других и не чувствовать себя одиноким\n\nНекоторые из наших вопросов:\n — Что изменилось в вашей жизни за последние годы?\n — Как вы себя чувствуете?\n — Что помогает вам держаться?\n\nГотовы начать?`, kbLearn);
});

bot.action('LETS_START', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  await startStoryFlow(ctx);
});

bot.action('I_WANT_TO_TELL', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  await startStoryFlow(ctx);
});

async function startStoryFlow(ctx) {
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.state = 'AWAITING_NAME_CITY';
  ctx.session.collected = {
    userId: ctx.from.id,
    username: ctx.from.username || null,
    nameAndCity: null,
    voices: [],
    contact: null,
    createdAt: new Date().toISOString(),
  };

  await ctx.reply('Сначала, пожалуйста, напишите, откуда вы, и как вас зовут. Имя может быть вымышленным. Это нужно, чтобы мы могли разместить ваш голос на карте.\n\nНапример:\n> Анна, Краснодар, Россия\n> Артем, Берлин, Германия\n> Антон, Ереван, Армения');
}

// Text handler for name/city and for contact input
bot.on('text', async (ctx) => {
  const state = ctx.session && ctx.session.state;
  const text = ctx.message.text.trim();

  if (state === 'AWAITING_NAME_CITY') {
    if (!ctx.session.collected) {
      ctx.session.collected = {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        nameAndCity: null,
        voices: [],
        contact: null,
        createdAt: new Date().toISOString(),
      };
    }
    ctx.session.collected.nameAndCity = text;
    ctx.session.state = 'AWAITING_VOICE';
    await ctx.reply('Спасибо. Теперь — ваш голос.\n\nМожно рассказать всё, что хочется.\nЕсли нужен ориентир — вот примеры вопросов:\n\n• Где вы были, когда всё началось?\n• Что изменилось в вашей жизни за последние 3 года?\n• Какие чувства ведущие в эти три года: вина, гнев, бессилие, сила, надежда, горе, безразличие?\n• Что помогает вам держаться? Что вы хотели бы сказать кому-то, кто переживает похожее?\n\nВы можете выбрать один вопрос. Или просто говорить, как идёт. Хронометраж не ограничен, но можно ориентироваться на полторы — две минуты.\n\nКогда будете готовы — запишите голосовое сообщение прямо здесь. Если запишите несколько — мы бережно склеим их в одну запись.');
    return;
  }

  if (state === 'AWAITING_CONTACT') {
    if (!ctx.session.collected) {
      ctx.session.collected = {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        nameAndCity: null,
        voices: [],
        contact: null,
        createdAt: new Date().toISOString(),
      };
    }
    ctx.session.collected.contact = text;
    ctx.session.state = null;
    await sendToAdmin(ctx);
    await ctx.reply('Спасибо, что оставили контакт. Мы используем его только для отправки ссылки на ваш фрагмент карты.\n\nСпасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', kbFinal);
    return;
  }

  if (!state) {
    await ctx.reply('Я вас не совсем понял — нажмите /start, чтобы начать, либо выберите кнопку.');
  }
});

// Voice message handling
bot.on('voice', async (ctx) => {
  const state = ctx.session && ctx.session.state;
  if (!state || (state !== 'AWAITING_VOICE' && state !== 'AWAITING_CONTACT')) {
    await ctx.reply('Я получил голосовое, но пока не знаю к какой истории его привязать. Нажмите /start и начните запись через кнопку "Хочу рассказать".');
    return;
  }

  const voice = ctx.message.voice;
  if (!ctx.session.collected) {
    ctx.session.collected = {
      userId: ctx.from.id,
      username: ctx.from.username || null,
      nameAndCity: null,
      voices: [],
      contact: null,
      createdAt: new Date().toISOString(),
    };
  }
  ctx.session.collected.voices.push({
    file_id: voice.file_id,
    file_unique_id: voice.file_unique_id,
    duration: voice.duration,
  });

  await ctx.reply('Спасибо. Ваше голосовое получено.\n\nХотите оставить контакт, чтобы мы прислали вам ссылку, когда запись появится на сайте? Это не обязательно.', kbContactYesNo);
  ctx.session.state = 'AWAITING_CONTACT_DECISION';
});

bot.action('LEAVE_CONTACT', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.state = 'AWAITING_CONTACT';
  await ctx.reply('Вы можете отправить email или Telegram-никнейм.\nМы используем его только для отправки ссылки на ваш фрагмент карты.');
});

bot.action('NO_CONTACT', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.state = null;
  await sendToAdmin(ctx);
  await ctx.reply('Спасибо. Ваш голос — часть живой карты.\nМы бережно обработаем и разместим его анонимно.\n\nСпасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', kbFinal);
});

bot.action('RECORD_MORE', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.state = 'AWAITING_VOICE';
  await ctx.reply('Хорошо — запишите ещё одно голосовое сообщение прямо здесь. Мы склеим несколько записей в одну.');
});

bot.action('FINISH', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Игнорируем ошибки answerCbQuery (query too old)
  }
  ctx.session = {};
  await ctx.reply('Спасибо! Если захотите — вы всегда можете вернуться и записать ещё. Мы рядом.');
});

// Send collected data to admin chat
async function sendToAdmin(ctx) {
  const data = ctx.session.collected;
  if (!data) return;

  const date = new Date(data.createdAt);
  const formattedDate = date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

  let message = `🆕 Новая история от пользователя ${data.username ? '@' + data.username : data.userId}\n`;
  message += `Имя/город: ${data.nameAndCity || '—'}\n`;
  message += `Контакт: ${data.contact || '—'}\n`;
  message += `Дата: ${formattedDate}`;

  try {
    // Сначала пробуем отправить в тред
    if (data.voices.length > 0) {
      const [first, ...rest] = data.voices;
      await ctx.telegram.sendVoice(ADMIN_CHAT_ID, first.file_id, { 
        caption: message,
        message_thread_id: 110
      });
      for (const v of rest) {
        await ctx.telegram.sendVoice(ADMIN_CHAT_ID, v.file_id, {
          message_thread_id: 110
        });
      }
    } else {
      await ctx.telegram.sendMessage(ADMIN_CHAT_ID, message, {
        message_thread_id: 110
      });
    }
  } catch (e) {
    console.error('Error sending to admin chat with thread:', e.message);
    
    // Fallback: пробуем отправить без thread_id
    try {
      if (data.voices.length > 0) {
        const [first, ...rest] = data.voices;
        await ctx.telegram.sendVoice(ADMIN_CHAT_ID, first.file_id, { 
          caption: message
        });
        for (const v of rest) {
          await ctx.telegram.sendVoice(ADMIN_CHAT_ID, v.file_id);
        }
      } else {
        await ctx.telegram.sendMessage(ADMIN_CHAT_ID, message);
      }
      console.log('Successfully sent to admin chat without thread');
    } catch (fallbackError) {
      console.error('Error sending to admin chat (fallback failed):', fallbackError.message);
      
      // Последний fallback: отправляем в личные сообщения пользователю
      try {
        await ctx.reply('⚠️ Произошла ошибка при отправке вашей истории администраторам. Попробуйте позже или обратитесь в поддержку.');
        console.error('Admin chat completely unavailable. Chat ID:', ADMIN_CHAT_ID);
      } catch (finalError) {
        console.error('Complete failure to send any message:', finalError.message);
      }
    }
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Проверка доступности админского чата при запуске
async function checkAdminChat() {
  try {
    const chat = await bot.telegram.getChat(ADMIN_CHAT_ID);
    console.log(`✅ Admin chat доступен: ${chat.title || chat.first_name || 'Unknown'}`);
    
    // Проверяем, есть ли у бота права на отправку сообщений
    const botMember = await bot.telegram.getChatMember(ADMIN_CHAT_ID, bot.botInfo.id);
    if (botMember.status === 'left' || botMember.status === 'kicked') {
      console.error('❌ Бот не является участником админского чата');
      return false;
    }
    
    console.log(`✅ Бот имеет статус: ${botMember.status}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при проверке админского чата:', error.message);
    console.error('Проверьте:');
    console.error('1. Правильность ADMIN_CHAT_ID в .env файле');
    console.error('2. Добавлен ли бот в админский чат');
    console.error('3. Есть ли у бота права на отправку сообщений');
    return false;
  }
}

bot.launch().then(async () => {
  console.log('Bot started');
  await checkAdminChat();
});
