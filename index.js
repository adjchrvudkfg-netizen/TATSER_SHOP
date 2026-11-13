const express = require('express');
const axios = require('axios');
const config = require('./config'); // Aapka config file jisme TOKEN aur API details hain

// Modules require karna
const shopModule = require('./shop');
const addBalanceModule = require('./addBalance');
const referralModule = require('./referral');
const supportModule = require('./support');
const adminApproval = require('./adminApproval');

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// In-memory Database (Users, Balances, etc.)
const db = {
  users: {}
};

// Helper: User data fetch ya create karne ke liye
function getUser(userId, firstName) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: firstName || "User",
      balance: 0.00,
      totalReferrals: 0,
      lifeTimeEarned: 0.00,
      totalPurchases: 0,
      totalSpent: 0.00
    };
  }
  return db.users[userId];
}

// Webhook / Message Endpoint
app.post(`/webhook/${TOKEN}`, async (req, res) => {
  res.sendStatus(200);
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";
      const from = update.message.from;
      const user = getUser(from.id, from.first_name);

      // /start command
      if (text.startsWith('/start')) {
        const args = text.split(' ');
        if (args.length > 1 && args[1].startsWith('ref_')) {
          const referrerId = args[1].replace('ref_', '');
          referralModule.handleNewReferral(from.id, referrerId, db.users);
        }

        const welcomeText = 
`👋 <b>Welcome to TATSER SHOP BOT!</b>

Aap yahan se automated digital panels kharid sakte hain aur balance add kar sakte hain.`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: welcomeText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Shop Panels", callback_data: "shop" }, { text: "💳 Add Balance", callback_data: "add_balance" }],
              [{ text: "👤 My Profile", callback_data: "profile" }, { text: "🔗 Referral", callback_data: "referral" }],
              [{ text: "📞 Support", callback_data: "support" }]
            ]
          }
        });
      }
    } 
    else if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;
      const from = cq.from;
      const user = getUser(from.id, from.first_name);

      // 1. Main Menu Navigation
      if (data === "main_menu") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: "🏠 <b>Main Menu:</b>",
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Shop Panels", callback_data: "shop" }, { text: "💳 Add Balance", callback_data: "add_balance" }],
              [{ text: "👤 My Profile", callback_data: "profile" }, { text: "🔗 Referral", callback_data: "referral" }],
              [{ text: "📞 Support", callback_data: "support" }]
            ]
          }
        });
      }
      // 2. Shop & Panels
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
      // 3. Direct Purchase QR (Shop Items)
      else if (data.startsWith("buy_")) {
        await shopModule.handleDirectPurchaseQR(user, chatId, data, TELEGRAM_API);
      }
      // 4. Add Balance Menu & Keypad
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
          const currentAmt = addBalanceModule.handleKeypadInput(user.id, data);
          const balanceMenu = addBalanceModule.getAddBalanceMenu(user.id);
          // Update existing message with new amount
          await axios.post(`${TELEGRAM_API}/editMessageText`, {
            chat_id: chatId,
            message_id: cq.message.message_id,
            text: balanceMenu.resText,
            parse_mode: "HTML",
            reply_markup: balanceMenu.reply_markup
          }).catch(() => {});
        }
      }
      // 5. Referral Menu
      else if (data === "referral") {
        const refPage = referralModule.getReferralMenu(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: refPage.resText,
          parse_mode: "HTML",
          reply_markup: refPage.reply_markup
        });
      }
      // 6. Support Menu
      else if (data === "support") {
        const supportPage = supportModule.getSupportMenu();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: supportPage.resText,
          parse_mode: "HTML",
          reply_markup: supportPage.reply_markup
        });
      }
      // 7. Payment Check / Admin Approval triggers
      else if (data.startsWith("check_order_") || data.startsWith("check_deposit_")) {
        await adminApproval.handleCheckPayment(cq, TELEGRAM_API);
      }
      else if (data.startsWith("approve_")) {
        await adminApproval.handleAdminApproval(cq, TELEGRAM_API, db.users);
      }
      else if (data.startsWith("reject_")) {
        await adminApproval.handleAdminRejection(cq, TELEGRAM_API);
      }

      // Answer callback query to remove loading loader on button
      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: cq.id
      }).catch(() => {});
    }
  } catch (err) {
    console.log("Error handling update:", err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`TATSER Bot is running on port ${PORT}`);

  // Render ka official external URL automatic utha kar Telegram par webhook set kar dega
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    const webhookUrl = `${renderUrl}/webhook/${TOKEN}`;
    try {
      await axios.get(`${TELEGRAM_API}/setWebhook?url=${webhookUrl}`);
      console.log(`✅ Webhook Successfully Set: ${webhookUrl}`);
    } catch (err) {
      console.log("❌ Failed to set webhook:", err.message);
    }
  } else {
    console.log("⚠️ RENDER_EXTERNAL_URL not found, webhook not set automatically.");
  }
});
