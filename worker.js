export default {
  async fetch(request, env, ctx) {
    // Проверяем, что запрос пришел от Telegram (POST)
    if (request.method !== 'POST') {
      return new Response('Bot is running!', { status: 200 });
    }

    try {
      const update = await request.json();
      
      // Обрабатываем сообщение
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const firstName = update.message.from.first_name || 'Клиент';

        // Обработка команды /start
        if (text === '/start') {
          await sendMessage(env.BOT_TOKEN, chatId, 
            `Привет, ${firstName}! 👋\n\nВыбери свою нишу (напиши цифру):\n1. 💅 Салон красоты\n2. 🚗 Автосервис\n3. 📚 Обучение`
          );
        } 
        // Обработка выбора ниши
        else if (['1', '2', '3'].includes(text)) {
          let nicheName = '';
          let services = [];
          
          if (text === '1') { nicheName = 'Салон красоты'; services = ['Стрижка', 'Маникюр']; }
          if (text === '2') { nicheName = 'Автосервис'; services = ['Замена масла', 'Диагностика']; }
          if (text === '3') { nicheName = 'Обучение'; services = ['Пробный урок', 'Курс']; }

          const bizId = String(chatId);
          
          // Сохраняем бизнес в базу KV
          await env.ZAPIS_DB.put(`biz_${bizId}`, JSON.stringify({
            name: nicheName, services: services, owner: firstName
          }));

          const link = `https://t.me/${env.BOT_USERNAME}?start=${bizId}`;
          await sendMessage(env.BOT_TOKEN, chatId, 
            `✅ Бизнес создан!\n\nТвоя ссылка для клиентов:\n${link}\n\nОтправь её клиентам!`
          );
        }
        // Обработка клиента, который пришел по ссылке от бизнеса
        else if (text.startsWith('/start ')) {
           const bizId = text.split(' ')[1];
           const bizData = await env.ZAPIS_DB.get(`biz_${bizId}`);
           
           if (bizData) {
             const biz = JSON.parse(bizData);
             await sendMessage(env.BOT_TOKEN, chatId, 
               `Добро пожаловать в ${biz.name}!\nВыберите услугу:\n${biz.services.join('\n')}`
             );
           } else {
             await sendMessage(env.BOT_TOKEN, chatId, 'Бизнес не найден.');
           }
        }
        // Любой другой текст
        else {
          await sendMessage(env.BOT_TOKEN, chatId, 'Напиши /start, чтобы начать.');
        }
      }

      return new Response('OK', { status: 200 });
    } catch (e) {
      // Логируем ошибку в консоль Cloudflare
      console.error(e);
      return new Response('Error', { status: 500 });
    }
  }
};

// Функция для отправки сообщений в Telegram
async function sendMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}
