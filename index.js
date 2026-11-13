const express = require('express');
const axios = require('axios');
const config = require('./config');

const shopModule = require('./shop');
const addBalanceModule = require('./addBalance');
const referralModule = require('./referral');
const supportModule = require('./support');
let keysData = {};
try { keysData = require('./keysdata'); } catch (e) {}

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const db = {
  users: {}
};

function getUser(userId, firstName) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: firstName || "User",
      balance: 15.00,
      totalReferrals: 0,
      lifeTimeEarned: 0.00,
      totalPurchases: 0,
      totalSpent: 0.00
    };
  }
  return db.users[userId];
}

function getPanelKeySafe(panelKey, duration) {
  if (keysData && typeof keysData.getNextKey === 'function') {
    return keysData.getNextKey(panelKey, duration);
  }
  return `TATSER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// Clean Main Menu (Unwanted buttons removed)
function getMainMenuMarkup(user) {
  const usdBal = (user.balance / config.CURRENCY_RATE).toFixed(2);
  
  const welcomeText = 
`🌺 - <b>VETLAM PANEL SHOP</b> - 🌺

🌸 Hello, <code>${user.name}</code> !

🔑 <b>Premium digital keys, instant delivery.</b>

➖ 🛒 <b>Wide product catalog</b>
➖ ⚡ <b>Instant key delivery</b>
➖ 💲 <b>Multiple payment gateways</b>
➖ ☘️ <b>Referrals & spin-to-win</b>
➖ 🆔 <b>24/7 admin support</b>

──────────────────────
👤 <b>User ID:</b> ${user.id}
💰 <b>Wallet Balance:</b> ₹${user.balance.toFixed(2)} (~$${usdBal})
──────────────────────`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛍️ Shop", callback_data: "shop" }],
      [{ text: "💳 Add Balance", callback_data: "add_balance" }, { text: "📦 My Orders", callback_data: "my_orders" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "🔗 Referral", callback_data: "referral" }],
      [{ text: "🎡 Daily Spin", callback_data: "daily_spin" }, { text: "📞 Support", callback_data: "support" }]
    ]
  };

  return { resText: welcomeText, reply_markup };
}

app.post(`/webhook/${TOKEN}`, async (req, res) => {
  res.sendStatus(200);
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";
      const from = update.message.from;
      const user = getUser(from.id, from.first_name);

      if (text.startsWith('/start')) {
        const args = text.split(' ');
        if (args.length > 1 && args[1].startsWith('ref_')) {
          const referrerId = args[1].replace('ref_', '');
          referralModule.handleNewReferral(from.id, referrerId, db.users);
        }

        const menu = getMainMenuMarkup(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
    } 
    else if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;
      const from = cq.from;
      const user = getUser(from.id, from.first_name);

      if (data === "main_menu") {
        const menu = getMainMenuMarkup(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
      else if (data === "shop") {
        const menu = shopModule.getShopMenu();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
      else if (data.startsWith("panel_")) {
        const panelKey = data.replace("panel_", "");
        const pkgMenu = shopModule.getPanelPackages(panelKey);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: pkgMenu.resText,
          parse_mode: "HTML",
          reply_markup: pkgMenu.reply_markup
        });
      }
      else if (data.startsWith("buy_")) {
        await shopModule.handleDirectPurchaseQR(user, chatId, data, TELEGRAM_API);
      }
      else if (data === "add_balance") {
        const balanceMenu = addBalanceModule.getAddBalanceMenu(user.id);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: balanceMenu.resText,
          parse_mode: "HTML",
          reply_markup: balanceMenu.reply_markup
        });
      }
      else if (data.startsWith("amt_")) {
        if (data === "amt_confirm") {
          await addBalanceModule.generatePaymentQR(user, chatId, TELEGRAM_API, axios);
        } else {
          addBalanceModule.handleKeypadInput(user.id, data);
          const balanceMenu = addBalanceModule.getAddBalanceMenu(user.id);
          await axios.post(`${TELEGRAM_API}/editMessageText`, {
            chat_id: chatId,
            message_id: cq.message.message_id,
            text: balanceMenu.resText,
            parse_mode: "HTML",
            reply_markup: balanceMenu.reply_markup
          }).catch(() => {});
        }
      }
      else if (data === "referral") {
        const refPage = referralModule.getReferralMenu(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: refPage.resText,
          parse_mode: "HTML",
          reply_markup: refPage.reply_markup
        });
      }
      else if (data === "support") {
        const supportPage = supportModule.getSupportMenu();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: supportPage.resText,
          parse_mode: "HTML",
          reply_markup: supportPage.reply_markup
        });
      }
      else if (data === "profile") {
        const profileText = `👤 <b>USER PROFILE</b>\n\n🆔 ID: <code>${user.id}</code>\n👤 Name: ${user.name}\n💰 Balance: ₹${user.balance.toFixed(2)}`;
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: profileText,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "my_orders") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📦 <b>My Orders</b>\n\nYou have completed ${user.totalPurchases || 0} purchases so far.`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "daily_spin") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🎡 <b>Daily Spin & Win</b>\n\nComing soon! Spin daily to win bonus wallet balance.`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      // Payment & Admin Approvals
      else if (data.startsWith("check_order_") || data.startsWith("check_deposit_")) {
        const parts = data.split("_");
        const orderId = parts[2];
        const amount = parts[3];
        
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Payment check ki ja rahi hai! Admin verification ke baad key mil jayegi.",
          show_alert: true
        });

        const ADMIN_CHAT_ID = "880513593";
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_CHAT_ID,
          text: `🔔 <b>NEW PAYMENT VERIFICATION</b>\n\n👤 User: ${user.name} (ID: <code>${user.id}</code>)\n🆔 Order ID: <code>${orderId}</code>\n💵 Amount: ₹${amount}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve & Send Key", callback_data: `approve_${user.id}_${amount}_${orderId}_phantom_1d` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${orderId}` }
            ]]
          }
        });
      }
      else if (data.startsWith("approve_")) {
        const parts = data.split("_");
        const targetUserId = parts[1];
        const amount = parseFloat(parts[2]);
        const orderId = parts[3];
        const panelKey = parts[4] || "phantom";
        const duration = parts[5] || "1d";

        if (db.users[targetUserId]) {
          db.users[targetUserId].totalPurchases = (db.users[targetUserId].totalPurchases || 0) + 1;
          db.users[targetUserId].totalSpent = (db.users[targetUserId].totalSpent || 0) + amount;
        }

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: `✅ <b>Approved & Key Dispatched!</b>\nUser: ${targetUserId}\nAmount: ₹${amount}`,
          parse_mode: "HTML"
        });

        const licenseKey = getPanelKeySafe(panelKey, duration);

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Payment Successful!</b>\n\n🎮 Game: ANDROID NON ROOT PANEL\n⏳ Duration: ${duration.toUpperCase()}\n🔑 Key: <code>${licenseKey}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        const targetUserId = parts[1];
        const orderId = parts[2];

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: `❌ <b>Payment Rejected</b> (Order: ${orderId})`,
          parse_mode: "HTML"
        });

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `❌ <b>Payment Verification Failed!</b> Order ID: <code>${orderId}</code> verify nahi ho paya.`,
          parse_mode: "HTML"
        }).catch(() => {});
      }

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: cq.id
      }).catch(() => {});
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Bot running on port ${PORT}`);
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    try {
      await axios.get(`${TELEGRAM_API}/setWebhook?url=${renderUrl}/webhook/${TOKEN}`);
      console.log(`Webhook set successfully!`);
    } catch (e) {}
  }
});
