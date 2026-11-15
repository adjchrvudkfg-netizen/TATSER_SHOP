const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('./config');

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = 8805135936; 
const UPI_ID = "9694421148@fam";
const SUPPORT_CHANNEL = "https://t.me/adityachoudhary5";

// MongoDB Connection URI from Environment Variables or direct fallback
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Adityachoudhary5:ADity%4020082006@cluster0.jkqvns1.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(MONGO_URI);
let db, usersCollection, shopCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("tatser_shop");
    usersCollection = db.collection("users");
    shopCollection = db.collection("shop_data");
    console.log("✅ Connected successfully to MongoDB Atlas!");
    await initializeDefaultShopData();
  } catch (e) {
    console.error("❌ MongoDB Connection Error:", e);
  }
}
connectDB();

// Default Shop Data Structure
const defaultShopData = {
  _id: "config",
  products: {
    drake: "🔥 Drake Panel",
    myth: "⚡ Myth Mod",
    primehook: "🍏 PRIME HOOK",
    phantom: "☠️ PHANTOM Android+ IOS 🔴",
    aimhack: "🎯 AIM HACK ⚔️",
    dripclient: "👾 DRIP CLIENT APK MOD",
    xreg: "📱 X - REG FF { MAIN ID SAFE } 🔴"
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
    dripclient: { apk: "https://t.me/c/4332593307/3", demo: "https://t.me/c/4453077350/5" },
    drake: { apk: "", demo: "" },
    myth: { apk: "", demo: "" },
    phantom: { apk: "", demo: "" },
    aimhack: { apk: "", demo: "" },
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
  processedOrders: {}
};

async function initializeDefaultShopData() {
  const existing = await shopCollection.findOne({ _id: "config" });
  if (!existing) {
    await shopCollection.insertOne(defaultShopData);
    console.log("✅ Default shop config inserted into MongoDB.");
  }
}

async function getShopData() {
  let data = await shopCollection.findOne({ _id: "config" });
  if (!data) {
    await initializeDefaultShopData();
    data = await shopCollection.findOne({ _id: "config" });
  }
  return data;
}

async function saveShopData(data) {
  await shopCollection.updateOne({ _id: "config" }, { $set: data }, { upsert: true });
}

async function getUser(userId, firstName) {
  let user = await usersCollection.findOne({ id: userId });
  if (!user) {
    user = {
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
    await usersCollection.insertOne(user);
  }
  return user;
}

async function updateUser(user) {
  await usersCollection.updateOne({ id: user.id }, { $set: user }, { upsert: true });
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
      [{ text: "💙 🛍️ Shop", callback_data: "shop" }],
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
      const user = await getUser(from.id, from.first_name);
      const shopDb = await getShopData();

      if (text.startsWith('/start')) {
        const menu = getMainMenuMarkup(user);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: menu.resText,
          parse_mode: "HTML",
          reply_markup: menu.reply_markup
        });
      }
      else if (text.startsWith('/update')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const updateMessage = `╔═══════════════════════╗\n      📢 𝗦𝗛𝗢𝗣 𝗨𝗣𝗗𝗔𝗧𝗘 📢\n╚═══════════════════════╝\n\n⚠️ 𝗕𝗢𝗧 𝗖𝗥𝗔𝗦𝗛𝗘𝗗 / 𝗧𝗘𝗖𝗛𝗡𝗜𝗖𝗔𝗟 𝗜𝗦𝗦𝗨𝗘 ⚠️\n\n━━━━━━━━━━━━━━━━━━━━━━━\n🚨 𝗜𝗺𝗽𝗼𝗿𝘁𝗮𝗻𝘁 𝗡𝗼𝘁𝗶𝗰𝗲:\n• Bot abhi crash ho gaya hai, isliye koi bhi use mat karna! ❌\n• Abhi koi bhi user wallet mein amount add mat karna! 💸🚫\n• Jaise hi bot wapas sahi hoga, yahan bata diya jayega. ⏳✅\n━━━━━━━━━━━━━━━━━━━━━━━\n\n💬 𝗞𝗲𝘆𝘀 𝗞𝗵𝗮𝗿𝗶𝗱𝗻𝗶 𝗛𝗮𝗶?\nAgar aapko abhi key chahiye toh niche **Support** button se admin ko personal DM karein! 👇⚡`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: updateMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "💬 Support / Personal DM", url: SUPPORT_CHANNEL }
              ]
            ]
          }
        });
      }
      else if (text.startsWith('/setlinks')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 4) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "⚠️ Use: <code>/setlinks panel apk_url demo_url</code>", parse_mode: "HTML" });
          return;
        }
        const panel = parts[1].toLowerCase();
        const apkUrl = parts[2];
        const demoUrl = parts[3];

        if (!shopDb.links) shopDb.links = {};
        shopDb.links[panel] = { apk: apkUrl, demo: demoUrl };
        await saveShopData(shopDb);

        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `✅ Links updated successfully for <b>${panel.toUpperCase()}</b>!`, parse_mode: "HTML" });
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
        await saveShopData(shopDb);

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
        await saveShopData(shopDb);

        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `🗑️ Product <code>${productKey}</code> removed successfully!`, parse_mode: "HTML" });
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
        await saveShopData(shopDb);

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
        await saveShopData(shopDb);

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
        await saveShopData(shopDb);
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `✅ Price updated for ${panel} (${duration}) to ₹${price}` });
      }
      else if (text.startsWith('/maintenance')) {
        if (from.id !== ADMIN_ID) return;
        const parts = text.split(" ");
        if (parts.length < 2) return;
        const productKey = parts[1].toLowerCase();
        
        shopDb.maintenance[productKey] = !shopDb.maintenance[productKey];
        await saveShopData(shopDb);
        
        await axios.post(`${TELEGRAM_API}/sendMessage`, { 
          chat_id: chatId, 
          text: `🔧 Maintenance status for <b>${productKey}</b> is now: <b>${shopDb.maintenance[productKey]}</b>`, 
          parse_mode: "HTML" 
        });
      }
      else if (text.startsWith('/addupdate')) {
        if (from.id !== ADMIN_ID) return;
        const updateMsg = text.replace('/addupdate', '').trim();
        const allUsers = await usersCollection.find({}).toArray();
        for (const u of allUsers) {
          try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: u.id, text: `📢 <b>SHOP UPDATE</b>\n\n${updateMsg}`, parse_mode: "HTML" });
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
      const user = await getUser(from.id, from.first_name);
      const shopDb = await getShopData();

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
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: panelText, parse_mode: "HTML", reply_markup: markup, disable_web_page_preview: true });
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
          await updateUser(user);

          await deletePrevMessage();
          const licenseKey = shopDb.stock[panel][duration].shift();
          await saveShopData(shopDb);

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
        await updateUser(user);
        await sendKeypadMenu(chatId, user);
      }
      else if (data.startsWith("num_") && data !== "num_del" && data !== "num_confirm") {
        const digit = data.replace("num_", "");
        user.customInput = (user.customInput === "0") ? digit : user.customInput + digit;
        await updateUser(user);
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_del") {
        user.customInput = (user.customInput.length > 1) ? user.customInput.slice(0, -1) : "0";
        await updateUser(user);
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
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "⏳ 24 ghante mein ek baar spin milta hai!", show_alert: true });
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
        await updateUser(user);

        setTimeout(async () => {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: `🎡 <b>DAILY SPIN RESULT</b> 🎡\n\n🎲 <b>Dice Number:</b> ${diceValue}\n🎉 <b>Congratulations! You won ₹${rewardAmount}</b> added to your wallet!\n\n💰 <b>New Balance:</b> ₹${user.balance.toFixed(2)}`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]]
            }
          });
        }, 3000);
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
        const shopDbData = await getShopData();
        if (shopDbData.processedOrders && shopDbData.processedOrders[parts[6]]) return;
        
        shopDbData.processedOrders = shopDbData.processedOrders || {};
        shopDbData.processedOrders[parts[6]] = true;
        
        const targetUserId = parts[2];
        const panel = parts[3];
        const duration = parts[4];

        if (!shopDbData.stock[panel] || !shopDbData.stock[panel][duration] || shopDbData.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Stock khatam ho gaya!", show_alert: true });
          return;
        }

        const licenseKey = shopDbData.stock[panel][duration].shift();
        await saveShopData(shopDbData);

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Approved! Key: <code>${licenseKey}</code>`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: targetUserId, text: `✅ <b>Payment Successful!</b>\nKey: <code>${licenseKey}</code>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
      }
      else if (data.startsWith("approve_dep_")) {
        const parts = data.split("_");
        const shopDbData = await getShopData();
        if (shopDbData.processedOrders && shopDbData.processedOrders[parts[4]]) return;
        
        shopDbData.processedOrders = shopDbData.processedOrders || {};
        shopDbData.processedOrders[parts[4]] = true;
        await saveShopData(shopDbData);
        
        let targetUser = await usersCollection.findOne({ id: parts[2] });
        if (targetUser) {
          targetUser.balance += parseFloat(parts[3]);
          await updateUser(targetUser);
        }

        await axios.post(`${TELEGRAM_API}/editMessageText`, { chat_id: chatId, message_id: messageId, text: `✅ Deposit Approved! ₹${parts[3]} added.`, parse_mode: "HTML" }).catch(() => {});
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: parts[2], text: `✅ <b>₹${parts[3]} Added to Wallet!</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] } }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        const shopDbData = await getShopData();
        shopDbData.processedOrders = shopDbData.processedOrders || {};
        shopDbData.processedOrders[parts[2]] = true;
        await saveShopData(shopDbData);
        
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
  const text = 
`🏦 <b>Custom Amount</b>

──────────────────────
Method: 🟢 <b>UPI (FamPay / Direct)</b>
Min: ₹1 | Max: ₹5,000
──────────────────────

Apna amount enter karo aur payment complete karke balance add karwao.

🔻 <b>Amount:</b> ₹${user.customInput} (~$${(user.customInput / config.CURRENCY_RATE).toFixed(2)})

<i>Amount type karo — buttons se:</i>`;

  const markup = { 
    inline_keyboard: [
      [{ text: "💰 1", callback_data: "num_1" }, { text: "💰 2", callback_data: "num_2" }, { text: "💰 3", callback_data: "num_3" }], 
      [{ text: "💰 4", callback_data: "num_4" }, { text: "💰 5", callback_data: "num_5" }, { text: "💰 6", callback_data: "num_6" }], 
      [{ text: "💰 7", callback_data: "num_7" }, { text: "💰 8", callback_data: "num_8" }, { text: "💰 9", callback_data: "num_9" }], 
      [{ text: "❌ Delete", callback_data: "num_del" }, { text: "💰 0", callback_data: "num_0" }, { text: "✅ Confirm", callback_data: "num_confirm" }], 
      [{ text: "🔙 Back", callback_data: "main_menu" }]
    ] 
  };
  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
}

async function updateKeypadMenu(chatId, messageId, user) {
  const text = 
`🏦 <b>Custom Amount</b>

──────────────────────
Method: 🟢 <b>UPI (FamPay / Direct)</b>
Min: ₹1 | Max: ₹5,000
──────────────────────

Apna amount enter karo aur payment complete karke balance add karwao.

🔻 <b>Amount:</b> ₹${user.customInput} (~$${(user.customInput / config.CURRENCY_RATE).toFixed(2)})

<i>Amount type karo — buttons se:</i>`;

  const markup = { 
    inline_keyboard: [
      [{ text: "💰 1", callback_data: "num_1" }, { text: "💰 2", callback_data: "num_2" }, { text: "💰 3", callback_data: "num_3" }], 
      [{ text: "💰 4", callback_data: "num_4" }, { text: "💰 5", callback_data: "num_5" }, { text: "💰 6", callback_data: "num_6" }], 
      [{ text: "💰 7", callback_data: "num_7" }, { text: "💰 8", callback_data: "num_8" }, { text: "💰 9", callback_data: "num_9" }], 
      [{ text: "❌ Delete", callback_data: "num_del" }, { text: "💰 0", callback_data: "num_0" }, { text: "✅ Confirm", callback_data: "num_confirm" }], 
      [{ text: "🔙 Back", callback_data: "main_menu" }]
    ] 
  };
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