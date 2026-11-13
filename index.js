const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN || '9114959377:AAHthP85iKlUZ4Mw6UfeMPvjGYdaOyzzSD0';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Mock Database for Users & Orders
const db = {
  users: {},
  orders: {}
};

function getUser(userId, firstName) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: firstName || 'Aditya',
      balance: 0.50,
      totalSpent: 195.00,
      totalOrders: 3,
      joined: '2026-10-23 21:23:31'
    };
  }
  return db.users[userId];
}

// Main Start Menu
function getStartMenu(user) {
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
━━━━━━━━━━━━━━━━━━━━`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛍️ Shop", callback_data: "shop", style: "primary" }],
      [
        { text: "₹ Add Balance", callback_data: "add_balance", style: "success" },
        { text: "🧾 My Orders", callback_data: "my_orders", style: "success" }
      ],
      [
        { text: "👤 My Profile", callback_data: "my_profile", style: "success" },
        { text: "▶️ How To Use", callback_data: "how_to_use", style: "success" }
      ],
      [
        { text: "🔗 Referral", callback_data: "referral", style: "success" },
        { text: "🎡 Daily Spin", callback_data: "daily_spin", style: "success" }
      ],
      [{ text: "📞 Support", callback_data: "support", style: "success" }],
      [
        { text: "💎 Selling Proof", url: "https://t.me/your_proof_channel", style: "success" },
        { text: "📊 Leaderboard", callback_data: "leaderboard", style: "success" }
      ]
    ]
  };
  return { text, reply_markup };
}

async function handleUpdate(update) {
  try {
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const from = update.message.from;
      const user = getUser(from.id, from.first_name);

      if (text.startsWith('/start')) {
        const menu = getStartMenu(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.text,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;
      const user = getUser(cb.from.id, cb.from.first_name);

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cb.id });

      let resText = "";
      let reply_markup = { inline_keyboard: [[{ text: "🔙 BACK TO MENU", callback_data: "main_menu", style: "primary" }]] };

      if (data === "main_menu") {
        const menu = getStartMenu(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: menu.text, parse_mode: "HTML", reply_markup: menu.reply_markup });
        return;
      } 
      else if (data === "shop") {
        resText = `🛒 <b>ANDROID NON ROOT PANELS</b>\n\n✅ <b>Choose a panel name:</b>`;
        reply_markup = {
          inline_keyboard: [
            [{ text: "💚 Prime Hook", callback_data: "panel_prime", style: "success" }],
            [{ text: "💧 Drip Wire", callback_data: "panel_drip", style: "success" }],
            [{ text: "⚡ Xreg Apk", callback_data: "panel_xreg", style: "success" }],
            [{ text: "🔥 Phantom", callback_data: "panel_phantom", style: "success" }],
            [{ text: "💧 Drake Panel", callback_data: "panel_drake", style: "success" }],
            [{ text: "🎯 Aim Hack", callback_data: "panel_aim", style: "success" }],
            [{ text: "🌀 MYTH PANEL", callback_data: "panel_myth", style: "success" }],
            [{ text: "🔙 BACK TO MENU", callback_data: "main_menu", style: "primary" }]
          ]
        };
      } 
      else if (data === "panel_myth") {
        resText = 
`🛒 <b>ANDROID NON ROOT PANEL - MYTH PANEL PACKAGES</b>

⏱ <b>Validity: 1 Hours</b>
💰 Price: ₹14.00 (~ $0.16)
📱 Limit: 1 Device | 📦 In Stock

⏱ <b>Validity: 3 Hours</b>
💰 Price: ₹30.00 (~ $0.28)
📱 Limit: 1 Device | 📦 In Stock

✅ <b>Select package below to instantly purchase:</b>`;
        reply_markup = {
          inline_keyboard: [
            [{ text: "🛒 Buy 1 Hours - ₹14.00", callback_data: "buy_myth_1h", style: "success" }],
            [{ text: "🛒 Buy 3 Hours - ₹30.00", callback_data: "buy_myth_3h", style: "success" }],
            [{ text: "🔙 BACK TO PANELS", callback_data: "shop", style: "primary" }]
          ]
        };
      }
      else if (data === "buy_myth_1h") {
        resText = 
`💳 <b>AUTO PAYMENT SYSTEM</b> 💳

📦 <b>Product:</b> Myth Panel (1 hours)
💵 <b>Pay Amount:</b> ₹14.00
🆔 <b>Order ID:</b> PTM${user.id}B275T320003

⏳ <b>Scan QR or pay via UPI to complete order automatically!</b>`;
        reply_markup = {
          inline_keyboard: [
            [{ text: "🔄 Check Payment", callback_data: "check_payment", style: "success" }],
            [{ text: "🔙 Cancel / Back", callback_data: "panel_myth", style: "primary" }]
          ]
        };
      }
      else if (data === "check_payment") {
        resText = `✅ <b>Payment Successful!</b>\n\n🎮 Game: MYTH PANEL ApkMod\n⏱ Duration: 1 Hours\n🔑 <b>Key:</b> <code>TATSER-8829-9382</code>\n\n🙏 Thank you for your purchase!`;
      }
      else if (data === "my_orders") {
        resText = 
`📦 <b>YOUR RECENT ORDERS</b>

📦 <b>ANDROID NON ROOT PANEL - Drip Client</b> (1 Days) (₹20.00)
🔑 Key: <code>2364083588</code>
📅 2026-11-09 09:16:09`;
      }
      else if (data === "my_profile") {
        resText = 
`🛡️ <b>— YOUR SECURE PROFILE —</b> 🛡️

👤 <b>Grid ID:</b> ${user.id}
👑 <b>Name:</b> ${user.name}
💼 <b>Account Level:</b> Regular User

💰 <b>— Wallet —</b>
Current Balance: ₹${user.balance} (~$0.01)

📊 <b>— Global Statistics —</b>
🔑 Total Orders: ${user.totalOrders}
💸 Total Spent: ₹${user.totalSpent}
👥 Total Referrals: 0
📅 Joined Grid: ${user.joined}`;
      }
      else if (data === "referral") {
        resText = 
`🔗 <b>AFFILIATE PROGRAM</b>

✅ <b>Status: ACTIVE</b>
💰 Earn 15% flat commission on every successful purchase made by your referred friends!

📊 <b>YOUR STATS:</b>
👥 Total Invited: 0
💵 Life-time Earned: ₹0.00

🔗 <b>Your Invite Link:</b>
<code>https://t.me/TatserShopBot?start=ref_${user.id}</code>`;
      }
      else if (data === "support") {
        resText = `📞 <b>24/7 ADMIN SUPPORT</b>\n\nContact: @TATSAR_SUPPORT`;
      }

      if (resText) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: resText,
          parse_mode: "HTML",
          reply_markup: reply_markup
        });
      }
    }
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

let offset = 0;
async function startPolling() {
  console.log("🚀 TATSER Advanced Shop Bot is running...");
  while (true) {
    try {
      const res = await axios.get(`${TELEGRAM_API}/getUpdates`, { params: { offset, timeout: 30 } });
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
app.get('/', (req, res) => res.send('TATSER Shop Bot is Live!'));
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startPolling();
});
