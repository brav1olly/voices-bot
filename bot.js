const { Telegraf } = require('telegraf');

const bot = new Telegraf('7985791190:AAG82Z_e_Kxxs4SorccNK_V0dzyOGlTt1CU');

const userStates = {};

const STATES = {
  START: 'start',
  ASK_INFO: 'ask_info',
  WAITING_VOICE: 'waiting_voice',
  ASK_CONTACT: 'ask_contact',
  FINISHED: 'finished'
};

bot.start((ctx) => {
  userStates[ctx.from.id] = { state: STATES.START };
  ctx.replyWithMarkdownV2(
    `Привет\\! Это бот проекта *Voices*\\.\n\n` +
    `Мы собираем голосовые истории — тёплые, уязвимые, настоящие\\. Про то, как менялись вы и мир вокруг с 2022 года\\.\n\n` +
    `Говорить — не обязательно правильно\\. Достаточно — честно\\.\n\n` +
    `Готовы поделиться голосом? 🎙️`,
    {
      reply_markup: {
        keyboard: [['Хочу рассказать'], ['Хочу узнать больше']],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }
  );
});

bot.hears('Хочу узнать больше', (ctx) => {
  ctx.replyWithMarkdownV2(
    `Проект *Voices* — это документальный веб\\-зин и карта голосов\\.\n\n` +
    `Мы собираем истории людей из разных городов и стран:\n` +
    `— Что изменилось за последние годы?\n` +
    `— Как вы себя чувствуете?\n` +
    `— Что помогает вам держаться?\n\n` +
    `Ваше сообщение останется анонимным\\.\n` +
    `Мы просто хотим услышать — и показать, как звучит мир\\.\n\n` +
    `Готовы начать?`,
    {
      reply_markup: {
        keyboard: [['Да, давайте']],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }
  );
});

bot.hears(['Хочу рассказать', 'Да, давайте'], (ctx) => {
  userStates[ctx.from.id] = { state: STATES.ASK_INFO };
  ctx.reply(
    `Сначала, пожалуйста, напишите своё имя и откуда вы.\n\nМожно использовать вымышленное имя, если хотите.\n\nНапример:\n> Артём, Берлин, Германия`
  );
});

bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state) return;

  if (state.state === STATES.ASK_INFO) {
    const input = ctx.message.text;
    const [name, ...locationParts] = input.split(',');
    const cityCountry = locationParts.join(',').trim();

    state.name = name.trim();
    state.cityCountry = cityCountry;
    state.state = STATES.WAITING_VOICE;

    ctx.reply(
      `Спасибо, ${state.name}.\n\nТеперь — ваш голос.\n\n` +
      `Можно рассказать всё, что хочется. Вот примеры вопросов:\n\n` +
      `• Где вы были, когда всё началось?\n` +
      `• Что изменилось в вашей жизни за 3 года?\n` +
      `• Что помогает вам держаться?\n` +
      `• Что вы хотели бы сказать кому-то, кто переживает похожее?\n\n` +
      `Когда будете готовы — запишите голосовое сообщение прямо здесь.`
    );
  }

  else if (state.state === STATES.ASK_CONTACT) {
    state.contact = ctx.message.text;
    state.state = STATES.FINISHED;

    ctx.reply('Спасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', {
      reply_markup: {
        keyboard: [['Записать ещё одно'], ['Завершить']],
        resize_keyboard: true,
      }
    });
  }
});

bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state || state.state !== STATES.WAITING_VOICE) return;

  state.voiceFileId = ctx.message.voice.file_id;
  state.state = STATES.ASK_CONTACT;

  const caption = `🎙 Новое голосовое сообщение\n\n` +
    `🙋‍♂ Имя: ${state.name || '—'}\n` +
    `🌍 Город, страна: ${state.cityCountry || '—'}\n` +
    `🆔 Telegram: @${ctx.from.username || 'нет'}\n`;

  await ctx.telegram.sendVoice(-1002511638935, state.voiceFileId, {
    caption,
    message_thread_id: 110
  });

  ctx.reply(
    'Спасибо. Ваш голос — часть живой карты.\n\nХотите оставить контакт, чтобы мы прислали вам ссылку, когда запись появится на сайте?',
    {
      reply_markup: {
        keyboard: [['Оставить контакт'], ['Нет, спасибо']],
        resize_keyboard: true,
        one_time_keyboard: true,
      }
    }
  );
});

bot.hears('Оставить контакт', (ctx) => {
  userStates[ctx.from.id].state = STATES.ASK_CONTACT;
  ctx.reply('Вы можете отправить email или Telegram-никнейм.\nМы используем его только для отправки ссылки на ваш фрагмент карты.');
});

bot.hears('Нет, спасибо', (ctx) => {
  userStates[ctx.from.id].state = STATES.FINISHED;
  ctx.reply('Спасибо, что поделились.\nЕсли захотите — вы всегда можете вернуться и записать ещё.', {
    reply_markup: {
      keyboard: [['Записать ещё одно'], ['Завершить']],
      resize_keyboard: true,
    }
  });
});

bot.hears('Записать ещё одно', (ctx) => {
  userStates[ctx.from.id] = { state: STATES.ASK_INFO };
  ctx.reply('Сначала, пожалуйста, напишите своё имя и откуда вы.\n\nНапример:\n> Анна, Париж, Франция');
});

bot.hears('Завершить', (ctx) => {
  delete userStates[ctx.from.id];
  ctx.reply('До встречи. Мы рядом 🌿', {
    reply_markup: { remove_keyboard: true }
  });
});

bot.launch();
console.log('bot start');