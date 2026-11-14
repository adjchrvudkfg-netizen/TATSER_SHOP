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

// Permanent storage file path on Render/Local
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

// Load saved data from file if exists
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

// Save data permanently function
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
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 3) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ <b>Invalid Format!</b>\nUse: <code>/addproduct key_name Display Name</code>",
            parse_mode: "HTML"
          });
          return;
        }

        const productKey = parts[1].toLowerCase();
        const productDisplayName = parts.slice(2).join(" ");

        shopDb.products[productKey] = productDisplayName;
        shopDb.maintenance[productKey] = false;
        if (!shopDb.stock[productKey]) shopDb.stock[productKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[productKey]) shopDb.prices[productKey] = { "1h": 10, "3h": 30, "6h": 60 };
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Product Added & Saved!</b>\n🆔 Key: <code>${productKey}</code>\n🏷️ Name: <b>${productDisplayName}</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/removeproduct')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 2) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "⚠️ Use: <code>/removeproduct key_name</code>", parse_mode: "HTML" });
          return;
        }

        const productKey = parts[1].toLowerCase();
        delete shopDb.products[productKey];
        delete shopDb.maintenance[productKey];
        delete shopDb.prices[productKey];
        delete shopDb.stock[productKey];
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🗑️ Product <code>${productKey}</code> removed successfully!`, parse_mode: "HTML" });
      }
      // BULK KEY ADD COMMAND: /addbulk drake 1h (followed by keys in new lines)
      else if (text.startsWith('/addbulk')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const lines = text.split('\n');
        const firstLineParts = lines[0].split(' ');

        if (firstLineParts.length < 3) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ <b>Invalid Format!</b>\nUse:\n<code>/addbulk panel duration</code>\n(aur neeche apni keys paste kar dein)",
            parse_mode: "HTML"
          });
          return;
        }

        const panel = firstLineParts[1].toLowerCase();
        const duration = firstLineParts[2].toLowerCase();

        if (!shopDb.products[panel]) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `❌ Product '${panel}' exist nahi karta!` });
          return;
        }

        if (!shopDb.stock[panel]) shopDb.stock[panel] = {};
        if (!shopDb.stock[panel][duration]) shopDb.stock[panel][duration] = [];

        // Extract keys from line 2 onwards
        const newKeys = lines.slice(1).map(k => k.trim()).filter(k => k.length > 0);

        if (newKeys.length === 0) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Koi key nahi mili! Please lines mein keys dalein." });
          return;
        }

        shopDb.stock[panel][duration].push(...newKeys);
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Bulk Keys Added Successfully!</b>\n\n📦 Panel: <b>${panel.toUpperCase()}</b>\n⏳ Duration: <b>${duration.toUpperCase()}</b>\n➕ Added: <b>${newKeys.length} keys</b>\n📊 Total Stock: <b>${shopDb.stock[panel][duration].length} keys</b>`,
          parse_mode: "HTML"
        });
      }
      else if (text.startsWith('/addkey')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 4) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "⚠️ Use: <code>/addkey panel duration key</code>", parse_mode: "HTML" });
          return;
        }

        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        const newKey = parts.slice(3).join(" ");

        if (!shopDb.products[panel]) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `❌ Product '${panel}' exist nahi karta!` });
          return;
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
        const price = parseInt(parts[3]);

        if (!shopDb.prices[panel]) shopDb.prices[panel] = {};
        shopDb.prices[panel][duration] = price;
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `✅ Price updated for ${panel} (${duration}) to ₹${price}` });
      }
      else if (text.startsWith('/removeprice')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 3) return;
        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        if (shopDb.prices[panel]) delete shopDb.prices[panel][duration];
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🗑️ Price removed for ${panel} (${duration})` });
      }
      else if (text.startsWith('/maintenance')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 2) return;
        const productKey = parts[1].toLowerCase();
        shopDb.maintenance[productKey] = !shopDb.maintenance[productKey];
        saveData();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🔧 Maintenance status updated for ${productKey}: ${shopDb.maintenance[productKey]}` });
      }
      else if (text.startsWith('/addupdate')) {
        if (from.id !== ADMIN_ID) return;
        const updateMsg = text.replace('/addupdate', '').trim();
        for (const uid in shopDb.users) {
          try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: uid, text: `📢 <b>SHOP UPDATE</b>\n\n${updateMsg}`, parse_mode: "HTML" });
          } catch (e) {}
        }
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chatId, text: "✅ Broadcast sent!" });
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
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: maintText, parse_mode: "HTML", reply_markup: maintMarkup });
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

        const markup = { inline_keyboard: durationButtons };
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
      }
      else if (data.startsWith("notify_")) {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "🔔 Notification set!", show_alert: true });
      }
      else if (data === "nostock") {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Yeh package out of stock hai!", show_alert: true });
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
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`;

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
        await sendKeypadMenu(chatId, user);
      }
      else if (data.startsWith("num_") && data !== "num_del" && data !== "num_confirm") {
        const digit = data.replace("num_", "");
        user.customInput = (user.customInput === "0") ? digit : user.customInput + digit;
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_del") {
        user.customInput = (user.customInput.length > 1) ? user.customInput.slice(0, -1) : "0";
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_confirm") {
        const amt = parseInt(user.customInput);
        if (!amt || amt <= 0) return;
        await deletePrevMessage();
        const orderId = Math.floor(100000 + Math.random() * 900000);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${amt}&cu=INR&tn=Deposit_${orderId}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: `💳 <b>ADD BALANCE QR</b>\nAmount: ₹${amt}\n🆔 Order ID: <code>${orderId}</code>`,
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
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🔗 <b>AFFILIATE</b>\n<code>${inviteLink}</code>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] } });
      }
      else if (data === "support") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🤖 <b>SUPPORT</b>\nAdmin: @TATSER_SUPPORT`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "💬 Chat", url: "https://t.me/+hYQLiyHcU3kxMTJl" }], [{ text: "🔙 Back", callback_data: "main_menu" }]] } });
      }
      else if (data === "profile") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `👤 <b>PROFILE</b>\nID: <code>${user.id}</code>\nName: ${user.name}\nBalance: ₹${user.balance.toFixed(2)}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] } });
      }
      else if (data === "my_orders") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `📦 <b>Orders</b>\nTotal: ${user.totalPurchases || 0}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] } });
      }
      else if (data === "daily_spin") {
        const now = Date.now();
        if (user.lastSpinTime && (now - user.lastSpinTime < 86400000)) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ 24 ghante mein ek baar spin milta hai!", show_alert: true });
          return;
        }
        user.lastSpinTime = now;
        const wonAmount = parseFloat((Math.random() * (1.00 - 0.10) + 0.10).toFixed(2));
        user.balance += wonAmount;
        saveData();
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🎡 <b>SPIN WON: ₹${wonAmount}</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] } });
      }
      else if (data.startsWith("check_prod_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ Checking payment...", show_alert: true });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW PAYMENT</b>\nUser: ${user.name} (<code>${user.id}</code>)\nProduct: ${parts[3].toUpperCase()} (${parts[4]})\nOrder ID: <code>${parts[2]}</code>\nAmount: ₹${parts[5]}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "✅ Approve", callback_data: `approve_prod_${user.id}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[2]}` }, { text: "❌ Reject", callback_data: `reject_${user.id}_${parts[2]}` }]] }
        }).catch(err => {});
      }
      else if (data.startsWith("check_dep_")) {
        const parts = data.split("_");
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ Checking deposit...", show_alert: true });
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW DEPOSIT</b>\nUser: ${user.name} (<code>${user.id}</code>)\nOrder ID: <code>${parts[2]}</code>\nAmount: ₹${parts[3]}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "✅ Approve", callback_data: `approve_dep_${user.id}_${parts[3]}_${parts[2]}` }, { text: "❌ Reject", callback_data: `reject_${user.id}_${parts[2]}` }]] }
        }).catch(err => {});
      }
      else if (data.startsWith("approve_prod_")) {
        const parts = data.split("_");
        if (shopDb.processedOrders[parts[6]]) return;
        shopDb.processedOrders[parts[6]] = true;
        const licenseKey = shopDb.stock[parts[3]][parts[4]].shift();
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Approved! Key: <code>${licenseKey}</code>`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: parts[2], text: `✅ <b>Payment Successful!</b>\nKey: <code>${licenseKey}</code>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
      }
      else if (data.startsWith("approve_dep_")) {
        const parts = data.split("_");
        if (shopDb.processedOrders[parts[4]]) return;
        shopDb.processedOrders[parts[4]] = true;
        shopDb.users[parts[2]].balance += parseFloat(parts[3]);
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Deposit Approved! ₹${parts[3]} added.`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: parts[2], text: `✅ <b>₹${parts[3]} Added to Wallet!</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
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
  } catch (err) {
    console.log("Error:", err.message);
  }
});

async function sendKeypadMenu(chatId, user) {
  const text = `🏦 <b>Custom Amount</b>\nAmount: <b>₹${user.customInput}</b>`;
  const markup = { inline_keyboard: [[{ text: "1", callback_data: "num_1" }, { text: "2", callback_data: "num_2" }, { text: "3", callback_data: "num_3" }], [{ text: "4", callback_data: "num_4" }, { text: "5", callback_data: "num_5" }, { text: "6", callback_data: "num_6" }], [{ text: "7", callback_data: "num_7" }, { text: "8", callback_data: "num_8" }, { text: "9", callback_data: "num_9" }], [{ text: "❌", callback_data: "num_del" }, { text: "0", callback_data: "num_0" }, { text: "✅", callback_data: "num_confirm" }], [{ text: "🔙 Back", callback_data: "main_menu" }]] };
  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
}

async function updateKeypadMenu(chatId, messageId, user) {
  const text = `🏦 <b>Custom Amount</b>\nAmount: <b>₹${user.customInput}</b>`;
  const markup = { inline_keyboard: [[{ text: "1", callback_data: "num_1" }, { text: "2", callback_data: "num_2" }, { text: "3", callback_data: "num_3" }], [{ text: "4", callback_data: "num_4" }, { text: "5", callback_data: "num_5" }, { text: "6", callback_data: "num_6" }], [{ text: "7", callback_data: "num_7" }, { text: "8", callback_data: "num_8" }, { text: "9", callback_data: "num_9" }], [{ text: "❌", callback_data: "num_del" }, { text: "0", callback_data: "num_0" }, { text: "✅", callback_data: "num_confirm" }], [{ text: "🔙 Back", callback_data: "main_menu" }]] };
  try {
    await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: markup });
  } catch (e) {}
}

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