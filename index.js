const express = require('express');
const axios = require('axios');
const config = require('./config');
let keysData = {};
try { keysData = require('./keysdata'); } catch (e) {}

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = "880513593"; // Aapki Admin ID ya Group Chat ID jahan notification jayegi
const UPI_ID = "9114959377@fampay"; 

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
      totalSpent: 0.00,
      customInput: "0"
    };
  }
  return db.users[userId];
}

function getPanelKeySafe(panelKey, duration) {
  if (keysData && typeof keysData.getNextKey === 'function') {
    return keysData.getNextKey(panelKey, duration);
  }
  return `TATSER-${panelKey.toUpperCase()}-${duration}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function getMainMenuMarkup(user) {
  const usdBal = (user.balance / config.CURRENCY_RATE).toFixed(2);
  
  const welcomeText = 
`⚡ - <b>TATSER PANEL SHOP</b> - ⚡

🌸 Hello, <code>${user.name}</code> !

🔑 <b>Premium digital keys, instant delivery.</b>

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
      const messageId = cq.message.message_id;
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
        const shopText = `🛒 <b>APNA PRODUCT CHUNLO!</b>\n\nSelect your panel below[span_1](start_span)[span_1](end_span):`;
        const shopMarkup = {
          inline_keyboard: [
            [{ text: "🔥 Drake Panel", callback_data: "panel_drake" }],
            [{ text: "⚡ Myth Mod", callback_data: "panel_myth" }],
            [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
          ]
        };
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text: shopText, parse_mode: "HTML", reply_markup: shopMarkup });
      }
      else if (data === "panel_myth") {
        const text = `⚡ <b>MYTH MOD PACKAGES</b>\n\nSelect duration & price[span_2](start_span)[span_2](end_span):`;
        const markup = {
          inline_keyboard: [
            [{ text: "⏳ 1 Hours - ₹14", callback_data: "buy_myth_1h_14" }],
            [{ text: "⏳ 3 Hours - ₹39", callback_data: "buy_myth_3h_39" }],
            [{ text: "⏳ 6 Hours - ₹72", callback_data: "buy_myth_6h_72" }],
            [{ text: "🔙 Back to Shop", callback_data: "shop" }]
          ]
        };
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
      }
      else if (data === "panel_drake") {
        const text = `🔥 <b>DRAKE PANEL PACKAGES</b>\n\nSelect duration & price[span_3](start_span)[span_3](end_span):`;
        const markup = {
          inline_keyboard: [
            [{ text: "⏳ 1 Hours - ₹9", callback_data: "buy_drake_1h_9" }],
            [{ text: "⏳ 3 Hours - ₹35", callback_data: "buy_drake_3h_35" }],
            [{ text: "⏳ 6 Hours - ₹65", callback_data: "buy_drake_6h_65" }],
            [{ text: "🔙 Back to Shop", callback_data: "shop" }]
          ]
        };
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
      }
      else if (data.startsWith("buy_")) {
        const parts = data.split("_");
        const panel = parts[1];
        const duration = parts[2];
        const price = parts[3];
        const orderId = Math.floor(100000 + Math.random() * 900000);

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: `💳 <b>DIRECT PURCHASE QR</b>\n\n📦 Product: ${panel.toUpperCase()} (${duration})\n💵 Price: ₹${price}\n🆔 Order ID: <code>${orderId}</code>\n\n<i>Scan and pay via UPI, then click 'Check Payment' below:</i>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Check Payment", callback_data: `check_prod_${orderId}_${panel}_${duration}_${price}` }],
              [{ text: "🔙 Back", callback_data: "shop" }]
            ]
          }
        });
      }
      // ADD BALANCE KEYPAD LOGIC (Fixed editing & clean input)
      else if (data === "add_balance") {
        user.customInput = "0";
        await sendKeypadMenu(chatId, user, null, true);
      }
      else if (data.startsWith("num_")) {
        const digit = data.replace("num_", "");
        if (user.customInput === "0") {
          user.customInput = digit;
        } else {
          user.customInput += digit;
        }
        await sendKeypadMenu(chatId, user, messageId, false);
      }
      else if (data === "num_del") {
        if (user.customInput.length > 1) {
          user.customInput = user.customInput.slice(0, -1);
        } else {
          user.customInput = "0";
        }
        await sendKeypadMenu(chatId, user, messageId, false);
      }
      else if (data === "num_confirm") {
        const amt = parseInt(user.customInput);
        if (!amt || amt <= 0) {
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: cq.id, text: "❌ Please enter a valid amount!", show_alert: true });
          return;
        }
        const orderId = Math.floor(100000 + Math.random() * 900000);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${UPI_ID}&pn=TATSER%20SHOP&am=${amt}&cu=INR&tn=Deposit_${orderId}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: `💳 <b>ADD BALANCE QR</b>\n\n💰 Amount: ₹${amt}\n🆔 Order ID: <code>${orderId}</code>\n\n<i>Scan and pay via UPI, then click below:</i>`,
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
        const inviteLink = `https://t.me/T4TSAR_NEW_SHOP_BOT?start=ref_${user.id}`;
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🔗 <b>AFFILIATE PROGRAM</b>\n\nInvite friends and earn rewards!\n\nYour Link:\n<code>${inviteLink}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "support") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📞 <b>CUSTOMER SUPPORT</b>\n\nContact Admin for any issues: @TATSER_SUPPORT`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "profile") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `👤 <b>USER PROFILE</b>\n\n🆔 ID: <code>${user.id}</code>\n👤 Name: ${user.name}\n💰 Balance: ₹${user.balance.toFixed(2)}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "my_orders") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📦 <b>My Orders</b>\n\nTotal Purchases: ${user.totalPurchases || 0}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "daily_spin") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🎡 <b>Daily Spin</b>\n\nComing soon!`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      // PAYMENT VERIFICATION & ADMIN NOTIFICATION
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
          text: `🔔 <b>NEW PRODUCT PAYMENT VERIFICATION</b>\n\n👤 User: ${user.name} (ID: <code>${user.id}</code>)\n📦 Product: ${panel.toUpperCase()} (${duration})\n🆔 Order: <code>${orderId}</code>\n💵 Amount: ₹${price}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve & Send Key", callback_data: `approve_prod_${user.id}_${panel}_${duration}_${price}_${orderId}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${orderId}` }
            ]]
          }
        });
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
          text: `🔔 <b>NEW WALLET DEPOSIT VERIFICATION</b>\n\n👤 User: ${user.name} (ID: <code>${user.id}</code>)\n🆔 Order: <code>${orderId}</code>\n💵 Amount: ₹${amount}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve & Add Balance", callback_data: `approve_dep_${user.id}_${amount}_${orderId}` },
              { text: "❌ Reject", callback_data: `reject_${user.id}_${orderId}` }
            ]]
          }
        });
      }
      else if (data.startsWith("approve_prod_")) {
        const parts = data.split("_");
        const targetUserId = parts[2];
        const panel = parts[3];
        const duration = parts[4];
        const price = parseFloat(parts[5]);
        const orderId = parts[6];

        if (db.users[targetUserId]) {
          db.users[targetUserId].totalPurchases = (db.users[targetUserId].totalPurchases || 0) + 1;
          db.users[targetUserId].totalSpent = (db.users[targetUserId].totalSpent || 0) + price;
        }

        await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
          chat_id: chatId,
          message_id: messageId,
          caption: `✅ <b>Approved & Key Dispatched!</b>\nUser: ${targetUserId}\nProduct: ${panel} (${duration})`,
          parse_mode: "HTML"
        }).catch(() => {});

        const licenseKey = getPanelKeySafe(panel, duration);

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

        if (db.users[targetUserId]) {
          db.users[targetUserId].balance += amount;
        }

        await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
          chat_id: chatId,
          message_id: messageId,
          caption: `✅ <b>Deposit Approved & Added!</b>\nUser: ${targetUserId}\nAmount: ₹${amount}`,
          parse_mode: "HTML"
        }).catch(() => {});

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Balance Added Successfully!</b>\n\n💵 Amount: <b>₹${amount}</b> added to your wallet.`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Menu", callback_data: "main_menu" }]] }
        }).catch(() => {});
      }
      else if (data.startsWith("reject_")) {
        const parts = data.split("_");
        const targetUserId = parts[1];
        const orderId = parts[2];

        await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
          chat_id: chatId,
          message_id: messageId,
          caption: `❌ <b>Payment Rejected</b> (Order: ${orderId})`,
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

async function sendKeypadMenu(chatId, user, messageId, isNew) {
  const text = 
`🏦 <b>Custom Amount</b>

Method: 🟢 UPI (ZapUPI)[span_4](start_span)[span_4](end_span)
Min: ₹1 | Max: ₹5,000[span_5](start_span)[span_5](end_span)

Apna amount enter karo aur payment complete karke balance add karwao[span_6](start_span)[span_6](end_span).

👇 Amount: <b>₹${user.customInput}</b> (~$${(user.customInput / config.CURRENCY_RATE).toFixed(2)})
👇 Amount type karo – buttons se:[span_7](start_span)[span_7](end_span)`;

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

  if (isNew || !messageId) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: chatId, text, parse_mode: "HTML", reply_markup: markup });
  } else {
    try {
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "HTML",
        reply_markup: markup
      });
    } catch (e) {
      // Agar message same content ki wajah se edit na ho toh ignore karein
    }
  }
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
