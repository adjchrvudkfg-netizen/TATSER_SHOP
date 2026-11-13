const express = require('express');
const axios = require('axios');
const config = require('./config');

// Saare modules ko require karna
const shopModule = require('./shop');
const addBalanceModule = require('./addBalance');
const referralModule = require('./referral');
const supportModule = require('./support');
const adminApproval = require('./adminaproval');

// Agar aapke paas yeh files hain toh inhe bhi link karein (optional safe checks ke sath)
let profileModule, orderModule, ludoSpinModule;
try { profileModule = require('./profile'); } catch (e) {}
try { orderModule = require('./order'); } catch (e) {}
try { ludoSpinModule = require('./ludospin'); } catch (e) {}

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// In-memory Database
const db = {
  users: {}
};

function getUser(userId, firstName) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: firstName || "User",
      balance: 15.00, // Starting default bonus balance ya 0
      totalReferrals: 0,
      lifeTimeEarned: 0.00,
      totalPurchases: 0,
      totalSpent: 0.00
    };
  }
  return db.users[userId];
}

// Main Menu Markup (Aapke screenshot 6503.png ke jaisa exact layout)
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
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "▶️ How To Use", callback_data: "how_to_use" }],
      [{ text: "🔗 Referral", callback_data: "referral" }, { text: "🎡 Daily Spin", callback_data: "daily_spin" }],
      [{ text: "📞 Support", callback_data: "support" }],
      [{ text: "💎 Selling Proof", url: "https://t.me/your_selling_proof" }, { text: "📊 Leaderboard", callback_data: "leaderboard" }]
    ]
  };

  return { resText: welcomeText, reply_markup };
}

// Webhook Endpoint
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
      else if (data === "how_to_use") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `▶️ <b>How To Use</b>\n\n1. Add balance or buy panels directly via QR.\n2. Submit payment and click 'Check Payment'.\n3. Admin verifies and sends key instantly!`,
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
      else if (data === "leaderboard") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📊 <b>Top Leaderboard</b>\n\n1. ${user.name} - ₹${user.totalSpent || 0} spent`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data.startsWith("check_order_") || data.startsWith("check_deposit_")) {
        await adminApproval.handleCheckPayment(cq, TELEGRAM_API);
      }
      else if (data.startsWith("approve_")) {
        await adminApproval.handleAdminApproval(cq, TELEGRAM_API, db.users);
      }
      else if (data.startsWith("reject_")) {
        await adminApproval.handleAdminRejection(cq, TELEGRAM_API);
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
