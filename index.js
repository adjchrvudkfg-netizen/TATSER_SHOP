const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = 8805135936; 
const UPI_ID = "9694421148@fam";

const dbFilePath = path.join(__dirname, 'shop_db.json');

let shopDb = {
  products: {
    drake: "🔥 Drake Panel",
    myth: "⚡ Myth Mod",
    primehook: "🍏 PRIME HOOK",
    phantom: "☠️ PHANTOM Android+ IOS 🔴",
    aimhack: "🎯 AIM HACK 🛠️",
    dripclient: "👾 DRIP CLIENT APK MOD",
    xreg: "🎴 X - REG FF { MAIN ID SAFE } 🔴"
  },
  maintenance: {
    drake: false,
    myth: false,
    primehook: false,
    phantom: false,
    aimhack: false,
    dripclient: false,
    xreg: false
  },
  prices: {
    drake: { "1h": 9, "3h": 35, "6h": 65 },
    myth: { "1h": 14, "3h": 39, "6h": 72 },
    primehook: { "1h": 49, "3h": 129, "6h": 249 },
    phantom: { "1h": 49, "3h": 129, "6h": 249 },
    aimhack: { "1h": 49, "3h": 129, "6h": 249 },
    dripclient: { "1h": 49, "3h": 129, "6h": 249 },
    xreg: { "1h": 49, "3h": 129, "6h": 249 }
  },
  stock: {
    drake: { "1h": [], "3h": [], "6h": [] },
    myth: { "1h": [], "3h": [], "6h": [] },
    primehook: { "1h": [], "3h": [], "6h": [] },
    phantom: { "1h": [], "3h": [], "6h": [] },
    aimhack: { "1h": [], "3h": [], "6h": [] },
    dripclient: { "1h": [], "3h": [], "6h": [] },
    xreg: { "1h": [], "3h": [], "6h": [] }
  },
  users: {},
  processedOrders: {}
};

try {
  if (fs.existsSync(dbFilePath)) {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.products) shopDb.products = parsed.products;
    if (parsed.maintenance) shopDb.maintenance = parsed.maintenance;
    if (parsed.prices) shopDb.prices = parsed.prices;
    if (parsed.stock) shopDb.stock = parsed.stock;
    if (parsed.users) shopDb.users = parsed.users;
    if (parsed.processedOrders) shopDb.processedOrders = parsed.processedOrders;
  }
} catch (e) {}

function saveData() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(shopDb, null, 2), 'utf8');
  } catch (e) {}
}

function getUser(userId, firstName) {
  if (!shopDb.users[userId]) {
    shopDb.users[userId] = {
      id: userId,
      name: firstName || "User",
      balance: 0.00,
      totalReferrals: 0,
      lifeTimeEarned: 0.00,
      totalPurchases: 0,
      totalSpent: 0.00,
      customInput: "0",
      lastSpinTime: 0
    };
    saveData();
  }
  return shopDb.users[userId];
}

function getMainMenuMarkup(user) {
  const usdBal = (user.balance / config.CURRENCY_RATE).toFixed(2);
  const welcomeText = 
`🌸 - <b>VETLAM BOT SHOP</b> - 🌸

👤 Hello, <code>${user.name}</code> !
🔑 <b>Premium digital keys, instant delivery.</b>

──────────────────────
➖ 🛍️ Wide product catalog
➖ ⚡ Instant key delivery
➖ 💳 Multiple payment gateways
➖ 👥 Referrals & spin-to-win
➖ 📞 24/7 admin support
──────────────────────
Tap any button below to begin.
──────────────────────
👤 <b>User ID:</b> ${user.id}
💰 <b>Wallet Balance:</b> ₹${user.balance.toFixed(2)} (~$${usdBal})
──────────────────────`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛍️ Shop", callback_data: "shop" }],
      [{ text: "💳 Add Balance", callback_data: "add_balance" }, { text: "📦 My Orders", callback_data: "my_orders" }],
      [{ text: "👤 My Profile", callback_data: "profile" }, { text: "📺 How To Use", callback_data: "how_to_use" }],
      [{ text: "🔗 Referral", callback_data: "referral" }, { text: "🎡 Daily Spin", callback_data: "daily_spin" }],
      [{ text: "📞 Support", callback_data: "support" }],
      [{ text: "💎 Selling Proof ↗", callback_data: "selling_proof" }, { text: "📊 Leaderboard", callback_data: "leaderboard" }]
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
        const menu = getMainMenuMarkup(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
      else if (text.startsWith('/addproduct')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 3) return;
        const productKey = parts[1].toLowerCase();
        const productDisplayName = parts.slice(2).join(" ");

        shopDb.products[productKey] = productDisplayName;
        shopDb.maintenance[productKey] = false;
        if (!shopDb.stock[productKey]) shopDb.stock[productKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[productKey]) shopDb.prices[productKey] = { "1h": 49, "3h": 129, "6h": 249 };
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Product Added!</b> <code>${productKey}</code>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addbulk')) {
        if (from.id !== ADMIN_ID) return;
        const lines = text.split('\n');
        const firstLineParts = lines[0].split(' ');
        if (firstLineParts.length < 3) return;

        const panel = firstLineParts[1].toLowerCase();
        const duration = firstLineParts[2].toLowerCase();

        if (!shopDb.products[panel]) {
          shopDb.products[panel] = panel.toUpperCase();
          shopDb.maintenance[panel] = false;
        }
        if (!shopDb.stock[panel]) shopDb.stock[panel] = {};
        if (!shopDb.stock[panel][duration]) shopDb.stock[panel][duration] = [];
        if (!shopDb.prices[panel]) shopDb.prices[panel] = { "1h": 49, "3h": 129, "6h": 249 };

        const newKeys = lines.slice(1).map(k => k.trim()).filter(k => k.length > 0);
        if (newKeys.length === 0) return;

        shopDb.stock[panel][duration].push(...newKeys);
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Bulk Keys Added!</b>\nPanel: <b>${panel.toUpperCase()}</b> (${duration.toUpperCase()})\nAdded: <b>${newKeys.length} keys</b>\nTotal Stock: <b>${shopDb.stock[panel][duration].length}</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addprice')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 4) return;
        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        const price = parseInt(parts[3]);

        if (!shopDb.prices[panel]) shopDb.prices[panel] = {};
        shopDb.prices[panel][duration] = price;
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `✅ Price updated for ${panel} (${duration}) to ₹${price}` });
      }
      else if (text.startsWith('/maintenance')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 2) return;
        const productKey = parts[1].toLowerCase();
        shopDb.maintenance[productKey] = !shopDb.maintenance[productKey];
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🔧 Maintenance updated for ${productKey}: ${shopDb.maintenance[productKey]}` });
      }
      else if (text.startsWith('/addupdate')) {
        if (from.id !== ADMIN_ID) return;
        const msgText = text.replace('/addupdate', '').trim();
        if (!msgText) return;

        for (const uid in shopDb.users) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: uid,
            text: msgText,
            parse_mode: "HTML"
          }).catch(() => {});
        }
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "✅ Broadcast sent successfully!" });
      }
    } 
    else if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data;
      const from = cq.from;
      const user = getUser(from.id, from.first_name);

      const deletePrevMessage = async () => {
        try {
          await axios.post(`${TELEGRAM_API}/deleteMessage`, { chat_id: chatId, message_id: messageId });
        } catch (e) {}
      };

      if (data === "main_menu") {
        await deletePrevMessage();
        const menu = getMainMenuMarkup(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: menu.resText, parse_mode: "HTML", reply_markup: menu.reply_markup });
      }
      else if (data === "shop") {
        await deletePrevMessage();
        const shopText = `🛒 <b>APNA PRODUCT CHUNLO!</b>\n\nSelect your panel below:`;
        const shopButtons = [];
        for (const key in shopDb.products) {
          shopButtons.push([{ text: shopDb.products[key], callback_data: `panel_${key}` }]);
        }
        shopButtons.push([{ text: "🔙 Main Menu", callback_data: "main_menu" }]);
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: shopText, parse_mode: "HTML", reply_markup: { inline_keyboard: shopButtons } });
      }
      else if (data.startsWith("panel_")) {
        const panelKey = data.replace("panel_", "");
        const panelName = shopDb.products[panelKey] || panelKey.toUpperCase();
        await deletePrevMessage();

        if (shopDb.maintenance && shopDb.maintenance[panelKey]) {
          const maintText = `🔴 <b>${panelName}</b>\n\n⚠️ <b>Ye product abhi maintenance mein hai.</b>`;
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: maintText, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "shop" }]] } });
          return;
        }

        const text = `⚡ <b>${panelName} PACKAGES</b>\n\nSelect duration & price:`;
        if (!shopDb.stock[panelKey]) shopDb.stock[panelKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[panelKey]) shopDb.prices[panelKey] = {};

        const durationButtons = [];
        const panelPrices = shopDb.prices[panelKey] || {};

        for (const dur in panelPrices) {
          const price = panelPrices[dur];
          const stockCount = shopDb.stock[panelKey] && shopDb.stock[panelKey][dur] ? shopDb.stock[panelKey][dur].length : 0;
          if (stockCount > 0) {
            durationButtons.push([{ text: `⏳ ${dur.toUpperCase()} - ₹${price}`, callback_data: `buy_${panelKey}_${dur}_${price}` }]);
          } else {
            durationButtons.push([{ text: `❌ ${dur.toUpperCase()} (Out of Stock)`, callback_data: "nostock" }]);
          }
        }
        durationButtons.push([{ text: "🔙 Back to Shop", callback_data: "shop" }]);
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: durationButtons } });
      }
      else if (data === "nostock") {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Yeh package out of stock hai!", show_alert: true });
      }
      else if (data === "add_balance") {
        await deletePrevMessage();
        const orderId = Math.floor(100000 + Math.random() * 900000);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `💳 <b>ADD BALANCE TO WALLET</b>\n\nSend amount to UPI ID:\n<code>${UPI_ID}</code>\n\n🆔 Order ID: <code>${orderId}</code>\n\nAfter payment, click below to notify admin for approval.`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Verify Payment", callback_data: `check_bal_${orderId}` }],
              [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
            ]
          }
        });
      }
      else if (data.startsWith("check_bal_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ Payment check request sent to admin...", show_alert: true });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>WALLET DEPOSIT REQUEST</b>\nUser: ${user.name} (<code>${user.id}</code>)\nOrder ID: <code>${parts[2]}</code>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Add ₹50", callback_data: `approve_bal_${user.id}_50_${parts[2]}` },
                { text: "✅ Add ₹100", callback_data: `approve_bal_${user.id}_100_${parts[2]}` }
              ],
              [{ text: "❌ Reject", callback_data: `reject_bal_${user.id}_${parts[2]}` }]
            ]
          }
        }).catch(() => {});
      }
      else if (data.startsWith("approve_bal_")) {
        const parts = data.split("_");
        const targetUserId = parts[2];
        const addAmount = parseFloat(parts[3]);
        const orderId = parts[4];

        if (shopDb.processedOrders[orderId]) return;
        shopDb.processedOrders[orderId] = true;

        const targetUser = getUser(targetUserId);
        targetUser.balance += addAmount;
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Deposit Approved! ₹${addAmount} added to user.`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: targetUserId, text: `✅ <b>₹${addAmount} Added to Wallet!</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
      }
      else if (data.startsWith("reject_bal_")) {
        const parts = data.split("_");
        shopDb.processedOrders[parts[2]] = true;
        saveData();
        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `❌ Deposit Rejected`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: parts[1], text: `❌ <b>Deposit Request Rejected!</b>`, parse_mode: "HTML" }).catch(() => {});
      }
      else if (data === "my_orders") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📦 <b>My Orders</b>\n\nTotal Purchases: <b>${user.totalPurchases || 0}</b>\nTotal Spent: <b>₹${(user.totalSpent || 0).toFixed(2)}</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "profile") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `👤 <b>USER PROFILE</b>\n\nName: ${user.name}\nID: <code>${user.id}</code>\nBalance: ₹${user.balance.toFixed(2)}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "support") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📞 <b>Support Center</b>\n\nContact Admin for help: <a href="https://t.me/ADITYACHOUDHARY5">@ADITYACHOUDHARY5</a>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }
      else if (data.startsWith("buy_")) {
        const parts = data.split("_");
        const panel = parts[1];
        const duration = parts[2];
        const price = parseInt(parts[3]);

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Out of Stock!", show_alert: true });
          return;
        }

        if (user.balance >= price) {
          user.balance -= price;
          user.totalPurchases = (user.totalPurchases || 0) + 1;
          user.totalSpent = (user.totalSpent || 0) + price;
          
          // Sirf wahi ek key shift hogi jo user ko assign ho rahi hai, baaki stock safe rahega!
          const licenseKey = shopDb.stock[panel][duration].shift();
          saveData();

          await deletePrevMessage();
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: `✅ <b>Purchase Successful!</b>\n📦 Product: <b>${panel.toUpperCase()} (${duration.toUpperCase()})</b>\n🔑 <b>Key:</b> <code>${licenseKey}</code>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
          });
        } else {
          await deletePrevMessage();
          const orderId = Math.floor(100000 + Math.random() * 900000);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=VETLAM%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`;

          await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: qrUrl,
            caption: `⚠️ <b>Insufficient Balance!</b>\nRequired: ₹${price}\n🆔 Order ID: <code>${orderId}</code>\n📌 UPI ID: <code>${UPI_ID}</code>`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Check Payment", callback_data: `check_prod_${orderId}_${panel}_${duration}_${price}` }],
                [{ text: "🔙 Back", callback_data: "shop" }]
              ]
            }
          });
        }
      }
      else if (data.startsWith("check_prod_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ Checking payment...", show_alert: true });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW PURCHASE PAYMENT</b>\nUser: ${user.name} (<code>${user.id}</code>)\nProduct: ${parts[3].toUpperCase()} (${parts[4]})\nOrder ID: <code>${parts[2]}</code>\nAmount: ₹${parts[5]}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "✅ Approve & Send Key", callback_data: `approve_prod_${user.id}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[2]}` }, { text: "❌ Reject", callback_data: `reject_${user.id}_${parts[2]}` }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("approve_prod_")) {
        const parts = data.split("_");
        const orderId = parts[6];
        if (shopDb.processedOrders[orderId]) return;
        shopDb.processedOrders[orderId] = true;

        const targetUserId = parts[2];
        const panel = parts[3];
        const duration = parts[4];

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Stock Khatam ho gaya!", show_alert: true });
          return;
        }

        const licenseKey = shopDb.stock[panel][duration].shift();
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Approved! Key assigned: <code>${licenseKey}</code>`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: targetUserId, text: `✅ <b>Payment Approved & Purchase Successful!</b>\n📦 Product: <b>${panel.toUpperCase()} (${duration.toUpperCase()})</b>\n🔑 <b>Key:</b> <code>${licenseKey}</code>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        shopDb.processedOrders[parts[2]] = true;
        saveData();
        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `❌ Rejected`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: parts[1], text: `❌ <b>Payment Rejected!</b>`, parse_mode: "HTML" }).catch(() => {});
      }

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id }).catch(() => {});
    }
  } catch (err) {}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Bot running on port ${PORT}`);
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    try {
      await axios.get(`${TELEGRAM_API}/setWebhook?url=${renderUrl}/webhook/${TOKEN}`);
    } catch (e) {}
  }
});