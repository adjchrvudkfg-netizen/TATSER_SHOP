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
const SUPPORT_CHANNEL = "https://t.me/adityachoudhary5";
const CURRENCY_RATE = config.CURRENCY_RATE || 84;

// Local JSON file storage path (no MongoDB)
const dbFilePath = path.join(__dirname, 'shop_db.json');

// Default Database Structure
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
  links: {
    primehook: { apk: "https://t.me/+T33Htf73m6VhZDc1", demo: "https://youtu.be/sample" },
    drake: { apk: "", demo: "" },
    myth: { apk: "", demo: "" },
    phantom: { apk: "", demo: "" },
    aimhack: { apk: "", demo: "" },
    dripclient: { apk: "", demo: "" },
    xreg: { apk: "", demo: "" }
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

// Load saved data safely with deep merging
try {
  if (fs.existsSync(dbFilePath)) {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    if (raw && raw.trim().length > 0) {
      const parsed = JSON.parse(raw);
      if (parsed.products) shopDb.products = parsed.products;
      if (parsed.maintenance) shopDb.maintenance = { ...shopDb.maintenance, ...parsed.maintenance };
      if (parsed.links) shopDb.links = { ...shopDb.links, ...parsed.links };
      if (parsed.prices) shopDb.prices = { ...shopDb.prices, ...parsed.prices };
      if (parsed.stock) shopDb.stock = { ...shopDb.stock, ...parsed.stock };
      if (parsed.users) shopDb.users = parsed.users;
      if (parsed.processedOrders) shopDb.processedOrders = parsed.processedOrders;
      console.log("✅ Database loaded successfully from shop_db.json!");
    }
  } else {
    saveData();
  }
} catch (e) {
  console.log("⚠️ Error loading database, using default:", e.message);
}

// Save data function with immediate sync
function saveData() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(shopDb, null, 2), 'utf8');
  } catch (e) {
    console.log("❌ Error saving database:", e.message);
  }
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
  const usdBal = (user.balance / CURRENCY_RATE).toFixed(2);

  const welcomeText =
`🌸 - <b>TATSER PANEL SHOP</b> - 🌸

👤 Hello, <code>${user.name}</code> !

🔑 <b>Premium digital keys, instant delivery.</b>

➖ 🛒 <b>Wide product catalog</b>
➖ ⚡ <b>Instant key delivery</b>
➖ 💲 <b>Multiple payment gateways</b>
➖ ☘️ <b>Referrals & spin-to-win</b>
➖ 🆔 <b>24/7 admin support</b>

──────────────────────
👤 <b>User ID:</b> ${user.id}
💰 <b>Wallet Balance:</b> ₹${user.balance.toFixed(2)} (~$${usdBal})
──────────────────────

<i>Tap any button below to begin.</i>`;

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

function buildKeypadText(user) {
  const numVal = parseFloat(user.customInput) || 0;
  const usdVal = (numVal / CURRENCY_RATE).toFixed(2);
  return (
`🏦 <b>Custom Amount</b>

──────────────────────
Method: 🟢 <b>UPI (FamPay / Direct)</b>
Min: ₹1 | Max: ₹5,000
──────────────────────

Apna amount enter karo aur payment complete karke balance add karwao.

🔻 <b>Amount:</b> ₹${user.customInput} (~$${usdVal})

<i>Amount type karo — buttons se:</i>`
  );
}

const KEYPAD_MARKUP = {
  inline_keyboard: [
    [{ text: "💰 1", callback_data: "num_1" }, { text: "💰 2", callback_data: "num_2" }, { text: "💰 3", callback_data: "num_3" }],
    [{ text: "💰 4", callback_data: "num_4" }, { text: "💰 5", callback_data: "num_5" }, { text: "💰 6", callback_data: "num_6" }],
    [{ text: "💰 7", callback_data: "num_7" }, { text: "💰 8", callback_data: "num_8" }, { text: "💰 9", callback_data: "num_9" }],
    [{ text: "❌ Delete", callback_data: "num_del" }, { text: "💰 0", callback_data: "num_0" }, { text: "✅ Confirm", callback_data: "num_confirm" }],
    [{ text: "🔙 Back", callback_data: "main_menu" }]
  ]
};

async function sendKeypadMenu(chatId, user) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: buildKeypadText(user),
    parse_mode: "HTML",
    reply_markup: KEYPAD_MARKUP
  });
}

async function updateKeypadMenu(chatId, messageId, user) {
  try {
    await axios.post(`${TELEGRAM_API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: buildKeypadText(user),
      parse_mode: "HTML",
      reply_markup: KEYPAD_MARKUP
    });
  } catch (e) {}
}

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Bot server is running.');
});

// Telegram Webhook Route
app.post('/webhook', async (req, res) => {
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
      else if (text.startsWith('/setlinks')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 4) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ Use: <code>/setlinks panel apk_url demo_url</code>",
            parse_mode: "HTML"
          });
          return;
        }
        const panel = parts[1].toLowerCase();
        const apkUrl = parts[2];
        const demoUrl = parts[3];

        if (!shopDb.links) shopDb.links = {};
        shopDb.links[panel] = { apk: apkUrl, demo: demoUrl };
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ Links updated successfully for <b>${panel.toUpperCase()}</b>!`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addproduct')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 3) return;
        const productKey = parts[1].toLowerCase();
        const productDisplayName = parts.slice(2).join(" ");

        shopDb.products[productKey] = productDisplayName;
        if (shopDb.maintenance[productKey] === undefined) shopDb.maintenance[productKey] = false;
        if (!shopDb.stock[productKey]) shopDb.stock[productKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[productKey]) shopDb.prices[productKey] = { "1h": 10, "3h": 30, "6h": 60 };
        if (!shopDb.links[productKey]) shopDb.links[productKey] = { apk: "", demo: "" };
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Product Added & Saved!</b>\n🆔 Key: <code>${productKey}</code>\n🏷️ Name: <b>${productDisplayName}</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/removeproduct')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 2) return;
        const productKey = parts[1].toLowerCase();
        delete shopDb.products[productKey];
        delete shopDb.maintenance[productKey];
        delete shopDb.prices[productKey];
        delete shopDb.stock[productKey];
        delete shopDb.links[productKey];
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🗑️ Product <code>${productKey}</code> removed successfully!`,
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
          if (shopDb.maintenance[panel] === undefined) shopDb.maintenance[panel] = false;
          if (!shopDb.links[panel]) shopDb.links[panel] = { apk: "", demo: "" };
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
          text: `✅ <b>Bulk Keys Added Successfully!</b>\n\n📦 Panel: <b>${panel.toUpperCase()}</b>\n⏳ Duration: <b>${duration.toUpperCase()}</b>\n➕ Added: <b>${newKeys.length} keys</b>\n📊 Total Stock: <b>${shopDb.stock[panel][duration].length} keys</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addkey')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 4) return;
        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        const newKey = parts.slice(3).join(" ");

        if (!shopDb.products[panel]) {
          shopDb.products[panel] = panel.toUpperCase();
          if (shopDb.maintenance[panel] === undefined) shopDb.maintenance[panel] = false;
          if (!shopDb.links[panel]) shopDb.links[panel] = { apk: "", demo: "" };
        }

        if (!shopDb.stock[panel]) shopDb.stock[panel] = {};
        if (!shopDb.stock[panel][duration]) shopDb.stock[panel][duration] = [];

        shopDb.stock[panel][duration].push(newKey);
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Key Added!</b> Total Stock: <b>${shopDb.stock[panel][duration].length}</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addprice')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 4) return;
        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        const price = parseInt(parts[3], 10);
        if (Number.isNaN(price) || price <= 0) return;

        if (!shopDb.prices[panel]) shopDb.prices[panel] = {};
        shopDb.prices[panel][duration] = price;
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ Price updated for ${panel} (${duration}) to ₹${price}`
        });
      }
      else if (text.startsWith('/maintenance')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 2) return;
        const productKey = parts[1].toLowerCase();

        shopDb.maintenance[productKey] = !shopDb.maintenance[productKey];
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🔧 Maintenance status for <b>${productKey}</b> is now: <b>${shopDb.maintenance[productKey]}</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addupdate')) {
        if (from.id !== ADMIN_ID) return;
        const updateMsg = text.replace('/addupdate', '').trim();
        for (const uid in shopDb.users) {
          try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
              chat_id: uid,
              text: `📢 <b>SHOP UPDATE</b>\n\n${updateMsg}`,
              parse_mode: "HTML"
            });
          } catch (e) {}
        }
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "✅ Broadcast sent!" });
      }
      else if (text === '/stock') {
        if (from.id !== ADMIN_ID) return;
        let stockText = `📊 <b>CURRENT STOCK STATUS</b>\n\n`;
        for (const p in shopDb.stock) {
          stockText += `🔥 <b>${p.toUpperCase()}</b> ${shopDb.maintenance[p] ? "(⚠️ MAINTENANCE)" : ""}:\n`;
          for (const d in shopDb.stock[p]) {
            stockText += `  - ${d}: <b>${shopDb.stock[p][d].length} keys left</b>\n`;
          }
        }
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: stockText, parse_mode: "HTML" });
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
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
      else if (data === "shop") {
        await deletePrevMessage();
        const shopText = `🛒 <b>APNA PRODUCT CHUNLO!</b>\n\nSelect your panel below:`;

        const shopButtons = [];
        for (const key in shopDb.products) {
          shopButtons.push([{ text: shopDb.products[key], callback_data: `panel_${key}` }]);
        }
        shopButtons.push([{ text: "🔙 Main Menu", callback_data: "main_menu" }]);

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: shopText,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: shopButtons }
        });
      }
      else if (data.startsWith("panel_")) {
        const panelKey = data.replace("panel_", "");
        const panelName = shopDb.products[panelKey] || panelKey.toUpperCase();

        await deletePrevMessage();

        if (shopDb.maintenance && shopDb.maintenance[panelKey]) {
          const maintText = `🔴 <b>${panelName}</b>\n\n⚠️ <b>Ye product abhi maintenance mein hai.</b>`;
          const maintMarkup = {
            inline_keyboard: [
              [{ text: "🔔 Notify Me", callback_data: `notify_${panelKey}` }],
              [{ text: "🛍️ Back", callback_data: "shop" }]
            ]
          };
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: maintText,
            parse_mode: "HTML",
            reply_markup: maintMarkup
          });
          return;
        }

        let panelText = `⚡ <b>${panelName}</b>\n\n`;
        const pLinks = shopDb.links && shopDb.links[panelKey] ? shopDb.links[panelKey] : { apk: "", demo: "" };

        if (pLinks.apk) {
          panelText += `📦 <b>APK LINK</b> 🔗\n<a href="${pLinks.apk}">👉 Click Here to Download APK</a>\n\n`;
        }
        panelText += `Select Duration:`;

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

        if (pLinks.demo) {
          durationButtons.push([{ text: "▶️ Watch Demo", url: pLinks.demo }]);
        }

        durationButtons.push([{ text: "🔙 Back to Shop", callback_data: "shop" }]);

        const markup = { inline_keyboard: durationButtons };
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: panelText,
          parse_mode: "HTML",
          reply_markup: markup,
          disable_web_page_preview: true
        });
      }
      else if (data.startsWith("notify_")) {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "🔔 Notification set!",
          show_alert: true
        });
      }
      else if (data === "nostock") {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "❌ Yeh package out of stock hai!",
          show_alert: true
        });
      }
      else if (data.startsWith("buy_")) {
        const parts = data.split("_");
        const panel = parts[1];
        const duration = parts[2];
        const price = parseInt(parts[3], 10);

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "❌ Out of Stock!",
            show_alert: true
          });
          return;
        }

        if (user.balance >= price) {
          user.balance -= price;
          user.totalPurchases = (user.totalPurchases || 0) + 1;
          user.totalSpent = (user.totalSpent || 0) + price;

          await deletePrevMessage();
          const licenseKey = shopDb.stock[panel][duration].shift();
          saveData();

          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: `✅ <b>Purchase Successful!</b>\n📦 Product: <b>${panel.toUpperCase()} (${duration.toUpperCase()})</b>\n🔑 <b>Key:</b> <code>${licenseKey}</code>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
          });
        } else {
          await deletePrevMessage();
          const orderId = Math.floor(100000 + Math.random() * 900000);
          const upiUri = encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upiUri}`;

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
      else if (data === "add_balance") {
        await deletePrevMessage();
        user.customInput = "0";
        saveData();
        await sendKeypadMenu(chatId, user);
      }
      else if (data.startsWith("num_") && data !== "num_del" && data !== "num_confirm") {
        const digit = data.replace("num_", "");
        if (user.customInput.length < 6) {
          user.customInput = (user.customInput === "0") ? digit : user.customInput + digit;
          saveData();
        }
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_del") {
        user.customInput = (user.customInput.length > 1) ? user.customInput.slice(0, -1) : "0";
        saveData();
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_confirm") {
        const amt = parseInt(user.customInput, 10);
        if (!amt || amt < 1 || amt > 5000) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "⚠️ Amount ₹1 se ₹5,000 ke beech hona chahiye!",
            show_alert: true
          });
          return;
        }
        await deletePrevMessage();
        const orderId = Math.floor(100000 + Math.random() * 900000);
        const upiUri = encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${amt}&cu=INR&tn=Deposit_${orderId}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upiUri}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: `💳 <b>ADD BALANCE QR</b>\nAmount: ₹${amt}\n🆔 Order ID: <code>${orderId}</code>\n📌 UPI ID: <code>${UPI_ID}</code>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Check Deposit", callback_data: `check_dep_${orderId}_${amt}` }],
              [{ text: "🔙 Back", callback_data: "add_balance" }]
            ]
          }
        });
      }
      else if (data === "referral") {
        await deletePrevMessage();
        const inviteLink = `https://t.me/T4TSAR_NEW_SHOP_BOT?start=ref_${user.id}`;
        const refText =
`💎 <b>TATSER AFFILIATE PROGRAM</b> 💎

✨ <i>Invite your friends and earn rewards instantly when they join and shop!</i>

🔗 <b>Your Exclusive Invite Link:</b>
<code>${inviteLink}</code>

👥 <b>Total Referrals:</b> <code>${user.totalReferrals || 0}</code>
💰 <b>Total Earned:</b> <code>₹${(user.lifeTimeEarned || 0).toFixed(2)}</code>

<i>Share this link in groups & friends to start earning!</i> 🚀`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: refText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📤 Share Invite Link", url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("🔥 Join TATSER SHOP for premium digital keys & instant delivery!")}` }],
              [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
            ]
          }
        });
      }
      else if (data === "support") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🤖 <b>TATSER 24/7 SUPPORT CENTER</b>\n\nNeed help with payments, keys, or orders? Click below to chat directly with admin support!`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💬 Chat with Support", url: SUPPORT_CHANNEL }],
              [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
            ]
          }
        });
      }
      else if (data === "profile") {
        await deletePrevMessage();
        const profileText =
`👤 <b>USER ACCOUNT PROFILE</b> 👤

──────────────────────
🏷️ <b>Name:</b> <code>${user.name}</code>
🆔 <b>User ID:</b> <code>${user.id}</code>
💰 <b>Wallet Balance:</b> <code>₹${user.balance.toFixed(2)}</code>
──────────────────────
📦 <b>Total Purchases:</b> <code>${user.totalPurchases || 0} orders</code>
💸 <b>Total Spent:</b> <code>₹${(user.totalSpent || 0).toFixed(2)}</code>
👥 <b>Referral Count:</b> <code>${user.totalReferrals || 0} users</code>
──────────────────────

✨ <i>Thank you for using TATSER SHOP!</i>`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: profileText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Add Balance", callback_data: "add_balance" }, { text: "📦 My Orders", callback_data: "my_orders" }],
              [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
            ]
          }
        });
      }
      else if (data === "my_orders") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📦 <b>My Orders History</b>\n\nTotal Purchases: <b>${user.totalPurchases || 0}</b>\nTotal Spent: <b>₹${(user.totalSpent || 0).toFixed(2)}</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "daily_spin") {
        const now = Date.now();
        if (user.lastSpinTime && (now - user.lastSpinTime < 86400000)) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "⏳ 24 ghante mein ek baar spin milta hai!",
            show_alert: true
          });
          return;
        }

        await deletePrevMessage();

        const diceMsg = await axios.post(`${TELEGRAM_API}/sendDice`, {
          chat_id: chatId,
          emoji: "🎲"
        });

        const diceValue = diceMsg.data.result.dice.value;
        const rewardAmount = parseFloat((diceValue * 0.5).toFixed(2));

        user.lastSpinTime = now;
        user.balance += rewardAmount;
        saveData();

        setTimeout(async () => {
          try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
              chat_id: chatId,
              text: `🎡 <b>DAILY SPIN RESULT</b> 🎡\n\n🎲 <b>Dice Number:</b> ${diceValue}\n🎉 <b>Congratulations! You won ₹${rewardAmount}</b> added to your wallet!\n\n💰 <b>New Balance:</b> ₹${user.balance.toFixed(2)}`,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]]
              }
            });
          } catch (e) {}
        }, 3000);
      }
      else if (data.startsWith("check_prod_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Checking payment...",
          show_alert: true
        });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW PAYMENT</b>\nUser: ${user.name} (<code>${user.id}</code>)\nProduct: ${parts[3].toUpperCase()} (${parts[4]})\nOrder ID: <code>${parts[2]}</code>\nAmount: ₹${parts[5]}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve", callback_data: `approve_prod_${user.id}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[2]}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${parts[2]}` }
            ]]
          }
        }).catch(() => {});
      }
      else if (data.startsWith("check_dep_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Checking deposit...",
          show_alert: true
        });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW DEPOSIT</b>\nUser: ${user.name} (<code>${user.id}</code>)\nOrder ID: <code>${parts[2]}</code>\nAmount: ₹${parts[3]}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve", callback_data: `approve_dep_${user.id}_${parts[3]}_${parts[2]}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${parts[2]}` }
            ]]
          }
        }).catch(() => {});
      }
      else if (data.startsWith("approve_prod_")) {
        const parts = data.split("_");
        if (shopDb.processedOrders[parts[6]]) return;
        shopDb.processedOrders[parts[6]] = true;

        const targetUserId = parts[2];
        const panel = parts[3];
        const duration = parts[4];

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "❌ Stock khatam ho gaya!",
            show_alert: true
          });
          return;
        }

        const licenseKey = shopDb.stock[panel][duration].shift();
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ Approved! Key: <code>${licenseKey}</code>`,
          parse_mode: "HTML"
        }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Payment Successful!</b>\nKey: <code>${licenseKey}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("approve_dep_")) {
        const parts = data.split("_");
        const targetUserId = parts[2];
        const amount = parseFloat(parts[3]);
        const orderId = parts[4];

        if (shopDb.processedOrders[orderId] || Number.isNaN(amount)) return;
        shopDb.processedOrders[orderId] = true;
        if (!shopDb.users[targetUserId]) {
          getUser(targetUserId, "User");
        }
        shopDb.users[targetUserId].balance += amount;
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ Deposit Approved! ₹${amount} added.`,
          parse_mode: "HTML"
        }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>₹${amount} Added to Wallet!</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        const targetUserId = parts[1];
        const orderId = parts[2];
        shopDb.processedOrders[orderId] = true;
        saveData();
        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `❌ Rejected`,
          parse_mode: "HTML"
        }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `❌ <b>Payment Rejected!</b>`,
          parse_mode: "HTML"
        }).catch(() => {});
      }

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id }).catch(() => {});
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
      await axios.get(`${TELEGRAM_API}/setWebhook`, {
        params: { url: `${renderUrl}/webhook` }
      });
      console.log(`Webhook set successfully!`);
    } catch (e) {}
  }
});