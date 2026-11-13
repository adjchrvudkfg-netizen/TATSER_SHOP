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
    myth: "⚡ Myth Mod"
  },
  prices: {
    drake: { "1h": 9, "3h": 35, "6h": 65 },
    myth: { "1h": 14, "3h": 39, "6h": 72 }
  },
  stock: {
    drake: {
      "1h": ["DRAKE-W1S5-ISNS-Q8C7", "DRAKE-QNAR-OWPM-8UX0"],
      "3h": ["DRAKE-LO4G-E905-PFHT"],
      "6h": ["DRAKE-YG3M-M37S-LEY2"]
    },
    myth: {
      "1h": ["MYTH-1H-KEY111", "MYTH-1H-KEY222"],
      "3h": ["MYTH-3H-KEY111"],
      "6h": ["MYTH-6H-KEY111"]
    }
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
      // 1. ADD NEW PRODUCT COMMAND: /addproduct phantom Phantom Mod
      else if (text.startsWith('/addproduct')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 3) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ <b>Invalid Format!</b>\nUse: <code>/addproduct key_name Display Name</code>\nExample: <code>/addproduct phantom Phantom Mod</code>",
            parse_mode: "HTML"
          });
          return;
        }

        const productKey = parts[1].toLowerCase();
        const productDisplayName = parts.slice(2).join(" ");

        shopDb.products[productKey] = productDisplayName;
        if (!shopDb.stock[productKey]) shopDb.stock[productKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[productKey]) shopDb.prices[productKey] = { "1h": 10, "3h": 30, "6h": 60 };
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Product Added & Saved Permanently!</b>\n\n🆔 Key: <code>${productKey}</code>\n🏷️ Name: <b>${productDisplayName}</b>\n\nAb price set karne ke liye:\n<code>/addprice ${productKey} 1h 49</code>\n\nKeys dalne ke liye:\n<code>/addkey ${productKey} 1h YOUR_KEY</code>`,
          parse_mode: "HTML"
        });
      }
      // 2. ADD PRICE COMMAND: /addprice panel duration price
      else if (text.startsWith('/addprice')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 4) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ <b>Invalid Format!</b>\nUse: <code>/addprice panel duration price</code>\nExample: <code>/addprice phantom 1h 49</code>",
            parse_mode: "HTML"
          });
          return;
        }

        const panel = parts[1].toLowerCase();
        const duration = parts[2].toLowerCase();
        const price = parseInt(parts[3]);

        if (!shopDb.products[panel]) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: `❌ Product '${panel}' exist nahi karta! Pehle /addproduct se add karein.` });
          return;
        }

        if (!shopDb.prices[panel]) shopDb.prices[panel] = {};
        shopDb.prices[panel][duration] = price;
        saveData();

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ <b>Price Updated & Saved!</b>\n\n📦 Panel: <b>${panel.toUpperCase()}</b>\n⏳ Duration: <b>${duration.toUpperCase()}</b>\n💵 New Price: <b>₹${price}</b>`,
          parse_mode: "HTML"
        });
      }
      // 3. ADD KEY COMMAND: /addkey panel duration key
      else if (text.startsWith('/addkey')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const parts = text.split(" ");
        if (parts.length < 4) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "⚠️ <b>Invalid Format!</b>\nUse: <code>/addkey panel duration key</code>\nExample: <code>/addkey drake 1h DRAKE-ABC-123</code>",
            parse_mode: "HTML"
          });
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
          text: `✅ <b>Key Successfully Added & Saved!</b>\n\n📦 Panel: <b>${panel.toUpperCase()}</b>\n⏳ Duration: <b>${duration.toUpperCase()}</b>\n🔑 Key: <code>${newKey}</code>\n📊 Total Stock: <b>${shopDb.stock[panel][duration].length}</b>`,
          parse_mode: "HTML"
        });
      }
      // 4. BROADCAST UPDATE COMMAND: /addupdate message
      else if (text.startsWith('/addupdate')) {
        if (from.id !== ADMIN_ID) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "❌ Aap admin nahi hain!" });
          return;
        }

        const updateMsg = text.replace('/addupdate', '').trim();
        if (!updateMsg) {
          await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: "⚠️ Please enter update message after /addupdate" });
          return;
        }

        let sentCount = 0;
        for (const uid in shopDb.users) {
          try {
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
              chat_id: uid,
              text: `📢 <b>TATSER SHOP UPDATE</b> 📢\n\n${updateMsg}`,
              parse_mode: "HTML"
            });
            sentCount++;
          } catch (e) {}
        }

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ Update broadcasted successfully to ${sentCount} users!`
        });
      }
      // 5. STOCK CHECK COMMAND: /stock
      else if (text === '/stock') {
        if (from.id !== ADMIN_ID) return;

        let stockText = `📊 <b>CURRENT STOCK STATUS</b>\n\n`;
        for (const p in shopDb.stock) {
          stockText += `🔥 <b>${p.toUpperCase()}</b>:\n`;
          for (const d in shopDb.stock[p]) {
            stockText += `  - ${d}: <b>${shopDb.stock[p][d].length} keys left</b>\n`;
          }
        }

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: stockText,
          parse_mode: "HTML"
        });
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
        const text = `⚡ <b>${panelName} PACKAGES</b>\n\nSelect duration & price:`;
        
        if (!shopDb.stock[panelKey]) shopDb.stock[panelKey] = { "1h": [], "3h": [], "6h": [] };
        if (!shopDb.prices[panelKey]) shopDb.prices[panelKey] = { "1h": 10, "3h": 30, "6h": 60 };

        const p1 = shopDb.prices[panelKey]["1h"] || 10;
        const p3 = shopDb.prices[panelKey]["3h"] || 30;
        const p6 = shopDb.prices[panelKey]["6h"] || 60;

        const s1 = shopDb.stock[panelKey]["1h"] ? shopDb.stock[panelKey]["1h"].length : 0;
        const s3 = shopDb.stock[panelKey]["3h"] ? shopDb.stock[panelKey]["3h"].length : 0;
        const s6 = shopDb.stock[panelKey]["6h"] ? shopDb.stock[panelKey]["6h"].length : 0;

        const markup = {
          inline_keyboard: [
            [{ text: s1 > 0 ? `⏳ 1 Hours - ₹${p1}` : `❌ 1 Hours (Out of Stock)`, callback_data: s1 > 0 ? `buy_${panelKey}_1h_${p1}` : "nostock" }],
            [{ text: s3 > 0 ? `⏳ 3 Hours - ₹${p3}` : `❌ 3 Hours (Out of Stock)`, callback_data: s3 > 0 ? `buy_${panelKey}_3h_${p3}` : "nostock" }],
            [{ text: s6 > 0 ? `⏳ 6 Hours - ₹${p6}` : `❌ 6 Hours (Out of Stock)`, callback_data: s6 > 0 ? `buy_${panelKey}_6h_${p6}` : "nostock" }],
            [{ text: "🔙 Back to Shop", callback_data: "shop" }]
          ]
        };
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
      }
      else if (data === "nostock") {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "❌ Yeh package abhi Out of Stock hai!",
          show_alert: true
        });
      }
      else if (data.startsWith("buy_")) {
        const parts = data.split("_");
        const panel = parts[1];
        const duration = parts[2];
        const price = parseInt(parts[3]);

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "❌ Out of Stock! Filhal yeh key available nahi hai.",
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

          if (!licenseKey) {
            user.balance += price;
            saveData();
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
              chat_id: chatId,
              text: `❌ <b>Out of Stock!</b>\n\nKeys khatam ho chuki hain. Aapka ₹${price} refund kar diya gaya hai.`,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
            });
            return;
          }

          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: `✅ <b>Purchase Successful via Wallet!</b>\n\n📦 Product: <b>${panel.toUpperCase()} (${duration.toUpperCase()})</b>\n💵 Amount Deducted: ₹${price}\n💰 Remaining Balance: ₹${user.balance.toFixed(2)}\n\n🔑 <b>Your Key:</b> <code>${licenseKey}</code>`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "main_menu" }]]
            }
          });
        } else {
          await deletePrevMessage();
          const orderId = Math.floor(100000 + Math.random() * 900000);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`;

          await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: qrUrl,
            caption: `⚠️ <b>Insufficient Wallet Balance!</b>\n\nRequired: ₹${price} | Your Balance: ₹${user.balance.toFixed(2)}\n📦 Product: ${panel.toUpperCase()} (${duration})\n🆔 Order ID: <code>${orderId}</code>\n📌 UPI ID: <code>${UPI_ID}</code>\n\n<i>Please scan and pay ₹${price} via FamPay UPI, then click 'Check Payment' below:</i>`,
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
        if (user.customInput === "0") {
          user.customInput = digit;
        } else {
          user.customInput += digit;
        }
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_del") {
        if (user.customInput.length > 1) {
          user.customInput = user.customInput.slice(0, -1);
        } else {
          user.customInput = "0";
        }
        await updateKeypadMenu(chatId, messageId, user);
      }
      else if (data === "num_confirm") {
        const amt = parseInt(user.customInput);
        if (!amt || amt <= 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Please enter a valid amount!", show_alert: true });
          return;
        }
        await deletePrevMessage();
        const orderId = Math.floor(100000 + Math.random() * 900000);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${amt}&cu=INR&tn=Deposit_${orderId}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: `💳 <b>ADD BALANCE QR</b>\n\n💰 Amount: ₹${amt}\n🆔 Order ID: <code>${orderId}</code>\n📌 UPI ID: <code>${UPI_ID}</code>\n\n<i>Scan and pay via FamPay UPI, then click below:</i>`,
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
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🔗 <b>AFFILIATE PROGRAM</b>\n\nInvite friends and earn rewards!\n\nYour Link:\n<code>${inviteLink}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "support") {
        await deletePrevMessage();
        const supportText = 
`🤖 <b>SUPPORT CENTER</b> 🤖

👋 <b>Need Any Help?</b>

➖ 🛒 <b>Purchase Support</b>
➖ 💳 <b>Payment Issues</b>
➖ 🔑 <b>Key Problems</b>
➖ ⚡ <b>Instant Assistance</b>

──────────────────────
👤 <b>Admin:</b> @TATSER_SUPPORT
🕒 <b>24x7 Active Support</b>
──────────────────────

⚠️ <b>Contact Admin If:</b>
👉 Balance nahi aaya
👉 Key nahi mila
👉 Purchase problem

🔥 <b>Fast Reply • Trusted Support</b> ✅`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: supportText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💬 Chat on Telegram", url: "https://t.me/+hYQLiyHcU3kxMTJl" }],
              [{ text: "🔙 Back to Home", callback_data: "main_menu" }]
            ]
          }
        });
      }
      else if (data === "profile") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `👤 <b>USER PROFILE</b>\n\n🆔 ID: <code>${user.id}</code>\n👤 Name: ${user.name}\n💰 Balance: ₹${user.balance.toFixed(2)}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "my_orders") {
        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📦 <b>My Orders</b>\n\nTotal Purchases: ${user.totalPurchases || 0}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "daily_spin") {
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (user.lastSpinTime && (now - user.lastSpinTime < cooldown)) {
          const remainingTime = Math.ceil((cooldown - (now - user.lastSpinTime)) / (1000 * 60 * 60));
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: `⏳ Aapne pichhle 24 ghante mein spin kar liya hai! Agla spin ${remainingTime} ghante baad milega.`,
            show_alert: true
          });
          return;
        }

        user.lastSpinTime = now;
        const wonAmount = parseFloat((Math.random() * (1.00 - 0.10) + 0.10).toFixed(2));
        user.balance += wonAmount;
        saveData();

        await deletePrevMessage();
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🎡 <b>DAILY SPIN RESULT</b> 🎡\n\n🎉 Badhai ho! Aapne Daily Spin mein <b>₹${wonAmount}</b> jeet liye hain.\n💰 Yeh amount aapke wallet balance mein add kar diya gaya hai!\n\nNew Balance: <b>₹${user.balance.toFixed(2)}</b>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 Back to Home", callback_data: "main_menu" }]]
          }
        });
      }
      else if (data.startsWith("check_prod_")) {
        const parts = data.split("_");
        const orderId = parts[2];
        const panel = parts[3];
        const duration = parts[4];
        const price = parts[5];

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Payment check ki ja rahi hai! Admin verification ke baad key mil jayegi.",
          show_alert: true
        });

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW PRODUCT PAYMENT VERIFICATION</b>\n\n👤 User Name: ${user.name}\n🆔 User ID: <code>${user.id}</code>\n📦 Product: ${panel.toUpperCase()} (${duration})\n🆔 Order ID: <code>${orderId}</code>\n💵 Amount: ₹${price}\n\n👇 Click below to approve:`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve & Send Key", callback_data: `approve_prod_${user.id}_${panel}_${duration}_${price}_${orderId}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${orderId}` }
            ]]
          }
        }).catch(err => console.log("Admin send error:", err.message));
      }
      else if (data.startsWith("check_dep_")) {
        const parts = data.split("_");
        const orderId = parts[2];
        const amount = parts[3];

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Deposit check ki ja rahi hai! Admin verification ke baad balance add hoga.",
          show_alert: true
        });

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_ID,
          text: `🔔 <b>NEW WALLET DEPOSIT VERIFICATION</b>\n\n👤 User Name: ${user.name}\n🆔 User ID: <code>${user.id}</code>\n🆔 Order ID: <code>${orderId}</code>\n💵 Amount: ₹${amount}\n\n👇 Click below to approve:`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve & Add Balance", callback_data: `approve_dep_${user.id}_${amount}_${orderId}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${orderId}` }
            ]]
          }
        }).catch(err => console.log("Admin send error:", err.message));
      }
      else if (data.startsWith("approve_prod_")) {
        const parts = data.split("_");
        const targetUserId = parts[2];
        const panel = parts[3];
        const duration = parts[4];
        const price = parseFloat(parts[5]);
        const orderId = parts[6];

        if (shopDb.processedOrders[orderId]) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "⚠️ Yeh order pehle hi process ho chuka hai!",
            show_alert: true
          });
          return;
        }

        if (!shopDb.stock[panel] || !shopDb.stock[panel][duration] || shopDb.stock[panel][duration].length === 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "❌ Out of Stock! Key available nahi hai.",
            show_alert: true
          });
          return;
        }

        shopDb.processedOrders[orderId] = true;

        if (shopDb.users[targetUserId]) {
          shopDb.users[targetUserId].totalPurchases = (shopDb.users[targetUserId].totalPurchases || 0) + 1;
          shopDb.users[targetUserId].totalSpent = (shopDb.users[targetUserId].totalSpent || 0) + price;
        }

        const licenseKey = shopDb.stock[panel][duration].shift();
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ <b>Approved & Key Dispatched! (Order: ${orderId})</b>\nUser ID: ${targetUserId}\nProduct: ${panel} (${duration})\nKey: <code>${licenseKey}</code>`,
          parse_mode: "HTML"
        }).catch(() => {});

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Payment Successful!</b>\n\n📦 Product: <b>${panel.toUpperCase()} (${duration.toUpperCase()})</b>\n🔑 Key: <code>${licenseKey}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("approve_dep_")) {
        const parts = data.split("_");
        const targetUserId = parts[2];
        const amount = parseFloat(parts[3]);
        const orderId = parts[4];

        if (shopDb.processedOrders[orderId]) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "⚠️ Yeh deposit pehle hi approve ho chuka hai!",
            show_alert: true
          });
          return;
        }
        shopDb.processedOrders[orderId] = true;

        if (shopDb.users[targetUserId]) {
          shopDb.users[targetUserId].balance += amount;
          saveData();
        }

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ <b>Deposit Approved & Added! (Order: ${orderId})</b>\nUser ID: ${targetUserId}\nAmount: ₹${amount}`,
          parse_mode: "HTML"
        }).catch(() => {});

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Balance Added Successfully!</b>\n\n💵 Amount: <b>₹${amount}</b> added to your wallet.\n💰 New Balance: ₹${shopDb.users[targetUserId].balance.toFixed(2)}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        const targetUserId = parts[1];
        const orderId = parts[2];

        if (shopDb.processedOrders[orderId]) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: cq.id,
            text: "⚠️ Yeh order pehle hi handle ho chuka hai!",
            show_alert: true
          });
          return;
        }
        shopDb.processedOrders[orderId] = true;
        saveData();

        await axios.post(`${TELEGRAM_API}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `❌ <b>Payment Rejected</b> (Order ID: ${orderId})`,
          parse_mode: "HTML"
        }).catch(() => {});

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `❌ <b>Payment Verification Failed!</b> Order ID: <code>${orderId}</code> verify nahi ho paya.`,
          parse_mode: "HTML"
        }).catch(() => {});
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

Method: 🟢 FamPay UPI (${UPI_ID})
Min: ₹1 | Max: ₹5,000

Apna amount enter karo aur payment complete karke balance add karwao.

👇 Amount: <b>₹${user.customInput}</b>
👇 Amount type karo – buttons se:`;

  const markup = {
    inline_keyboard: [
      [
        { text: "💰 1", callback_data: "num_1" },
        { text: "💰 2", callback_data: "num_2" },
        { text: "💰 3", callback_data: "num_3" }
      ],
      [
        { text: "💰 4", callback_data: "num_4" },
        { text: "💰 5", callback_data: "num_5" },
        { text: "💰 6", callback_data: "num_6" }
      ],
      [
        { text: "💰 7", callback_data: "num_7" },
        { text: "💰 8", callback_data: "num_8" },
        { text: "💰 9", callback_data: "num_9" }
      ],
      [
        { text: "❌ Delete", callback_data: "num_del" },
        { text: "💰 0", callback_data: "num_0" },
        { text: "✅ Confirm", callback_data: "num_confirm" }
      ],
      [{ text: "🔙 Back", callback_data: "main_menu" }]
    ]
  };

  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
}

async function updateKeypadMenu(chatId, messageId, user) {
  const text = 
`🏦 <b>Custom Amount</b>

Method: 🟢 FamPay UPI (${UPI_ID})
Min: ₹1 | Max: ₹5,000

Apna amount enter karo aur payment complete karke balance add karwao.

👇 Amount: <b>₹${user.customInput}</b>
👇 Amount type karo – buttons se:`;

  const markup = {
    inline_keyboard: [
      [
        { text: "💰 1", callback_data: "num_1" },
        { text: "💰 2", callback_data: "num_2" },
        { text: "💰 3", callback_data: "num_3" }
      ],
      [
        { text: "💰 4", callback_data: "num_4" },
        { text: "💰 5", callback_data: "num_5" },
        { text: "💰 6", callback_data: "num_6" }
      ],
      [
        { text: "💰 7", callback_data: "num_7" },
        { text: "💰 8", callback_data: "num_8" },
        { text: "💰 9", callback_data: "num_9" }
      ],
      [
        { text: "❌ Delete", callback_data: "num_del" },
        { text: "💰 0", callback_data: "num_0" },
        { text: "✅ Confirm", callback_data: "num_confirm" }
      ],
      [{ text: "🔙 Back", callback_data: "main_menu" }]
    ]
  };

  try {
    await axios.post(`${TELEGRAM_API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML",
      reply_markup: markup
    });
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