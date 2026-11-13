const config = require('./config');

// 🎲 LUDO SPIN / LUCKY DICE MODULE
function handleLudoSpin(user, chatId, TELEGRAM_API, axios) {
  const currentTime = Date.now();
  const cooldownTime = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds

  // Cooldown check (24 hours ke andar dobara spin karne par restriction)
  if (currentTime - user.lastSpinTime < cooldownTime) {
    return axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "❌ <b>Cooldown Active!</b>\nYou already played today. Come back tomorrow.",
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 BACK", callback_data: "main_menu", style: "danger" }]]
      }
    });
  }

  // Agar 24 hours ho chuke hain, toh spin start menu dikhao
  return axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: "🎁 <b>— LUDO SPIN —</b> 🎁\n\nTest your luck! You can spin once every 24 hours.",
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎲 Spin Dice Now!", callback_data: "execute_spin", style: "success" }],
        [{ text: "🔙 BACK", callback_data: "main_menu", style: "danger" }]
      ]
    }
  });
}

// Jab user 'Spin Dice Now!' par click kare
async function executeSpin(user, chatId, TELEGRAM_API, axios) {
  const currentTime = Date.now();
  const cooldownTime = 24 * 60 * 60 * 1000;

  if (currentTime - user.lastSpinTime < cooldownTime) {
    return axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "❌ <b>Cooldown Active!</b>\nYou already played today. Come back tomorrow.",
      parse_mode: "HTML"
    });
  }

  // Last spin time update karo
  user.lastSpinTime = currentTime;
  
  // Reward add karo (jaise ₹0.10)
  const reward = 0.10;
  user.balance += reward;
  const usdBalance = (user.balance / config.CURRENCY_RATE).toFixed(2);

  // Telegram ka native animated dice bhejdo
  await axios.post(`${TELEGRAM_API}/sendDice`, {
    chat_id: chatId,
    emoji: "🎲"
  });

  // Result message
  return axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: 
`🎁 <b>LUCKY DICE RESULT</b> 🔨 💯

🎲 <b>Dice Value:</b> 3

💸 <b>You Won:</b> ₹${reward.toFixed(2)} (~$0.00)
👛 <b>Total Balance:</b> ₹${user.balance.toFixed(2)} (~$${usdBalance})

<b>Congratulations! Come back after 24 hours.</b>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "📚 BACK TO MENU", callback_data: "main_menu", style: "success" }]]
    }
  });
}

module.exports = { handleLudoSpin, executeSpin };
