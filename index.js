const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Aapka Bot Token yahan set kar diya gaya hai
const BOT_TOKEN = process.env.BOT_TOKEN || '9114959377:AAHthP85iKlUZ4Mw6UfeMPvjGYdaOyzzSD0';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const users = {};

function getUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      name: firstName || 'User',
      balance: 15 // Screenshot ke mutabiq default balance ₹15
    };
  }
  return users[userId];
}

function getStartPayload(chatId, user) {
  const usdBalance = (user.balance / 93.75).toFixed(2);

  const text = 
`🌺 – <b>TATSER PANEL SHOP</b> – 🌺

🏩 <i>Hello, ${user.name}</i>

🗝 <b>Premium digital keys, instant delivery.</b>

– 🏪 <b>Wide product catalog</b>
– ⚡ <b>Instant key delivery</b>
– 💲 <b>Multiple payment gateways</b>
– 🎁 <b>Referrals & spin-to-win</b>
– 🆔 <b>24/7 admin support</b>

<b>Tap any button below to begin.</b>

━━━━━━━━━━━━━━━━━━━━
👤 User ID: <code>${user.id}</code>
👛 Wallet Balance: ₹${user.balance} (~$${usdBalance})
━━━━━━━━━━━━━━━━━━━━

<i>Tap any button below to begin.</i>`;

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: "🛍️ Shop",
          callback_data: "shop",
          style: "primary" // Blue Color Button
        }
      ],
      [
        {
          text: "₹ Add Balance",
          callback_data: "add_balance",
          style: "success" // Green Color Button
        },
        {
          text: "🧾 My Orders",
          callback_data: "my_orders",
          style: "success"
        }
      ],
      [
        {
          text: "👤 My Profile",
          callback_data: "my_profile",
          style: "success"
        },
        {
          text: "▶️ How To Use",
          callback_data: "how_to_use",
          style: "success"
        }
      ],
      [
        {
          text: "🔗 Referral",
          callback_data: "referral",
          style: "success"
        },
        {
          text: "🎡 Daily Spin",
          callback_data: "daily_spin",
          style: "success"
        }
      ],
      [
        {
          text: "📞 Support",
          callback_data: "support",
          style: "success"
        }
      ],
      [
        {
          text: "💎 Selling Proof",
          url: "https://t.me/your_proof_channel", // Apna channel link yahan daal sakte hain
          style: "success"
        },
        {
          text: "📊 Leaderboard",
          callback_data: "leaderboard",
          style: "success"
        }
      ]
    ]
  };

  return {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    reply_markup: reply_markup
  };
}

async function handleUpdate(update) {
  try {
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const from = update.message.from;

      if (text.startsWith('/start')) {
        const user = getUser(from.id, from.username || from.first_name);
        const payload = getStartPayload(chatId, user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: cb.id
      });

      let replyText = "";
      switch (data) {
        case "shop":
          replyText = "🛍️ <b>TATSER SHOP CATALOG</b>\n\nSelect a panel below:\n• Phantom Panel\n• Drip Client\n• Aimbot Pro";
          break;
        case "add_balance":
          replyText = "💳 <b>ADD BALANCE</b>\n\nSend payment via UPI and submit UTR to add funds to your wallet.";
          break;
        case "my_orders":
          replyText = "🧾 <b>MY ORDERS</b>\n\nYou have 0 active orders right now.";
          break;
        case "my_profile":
          replyText = `👤 <b>YOUR PROFILE</b>\n\nID: <code>${cb.from.id}</code>\nName: ${cb.from.first_name}`;
          break;
        case "how_to_use":
          replyText = "▶️ <b>HOW TO USE</b>\n\n1. Click Add Balance\n2. Go to Shop & buy key\n3. Paste key in panel & enjoy!";
          break;
        case "referral":
          replyText = `🔗 <b>REFERRAL PROGRAM</b>\n\nShare your link & earn ₹5 per invite:\nhttps://t.me/YourBotUsername?start=${cb.from.id}`;
          break;
        case "daily_spin":
          replyText = "🎡 <b>DAILY SPIN</b>\n\nCome back after 24 hours for your next free spin!";
          break;
        case "support":
          replyText = "📞 <b>24/7 ADMIN SUPPORT</b>\n\nContact: @TATSAR_SUPPORT";
          break;
        case "leaderboard":
          replyText = "📊 <b>TOP BUYERS LEADERBOARD</b>\n\n1. King_FF - ₹4,500\n2. ProGamer - ₹3,200";
          break;
      }

      if (replyText) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: replyText,
          parse_mode: "HTML"
        });
      }
    }
  } concludes => {
    // Error handler catch
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

let offset = 0;
async function startPolling() {
  console.log("🚀 TATSER PANEL SHOP Bot is running...");
  while (true) {
    try {
      const res = await axios.get(`${TELEGRAM_API}/getUpdates`, {
        params: { offset, timeout: 30 }
      });
      for (const update of res.data.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('TATSER Bot is Live!'));
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startPolling();
});
