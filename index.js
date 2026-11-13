const express = require('express');
const axios = require('axios');
const config = require('./config');

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
      balance: 15.00,
      totalReferrals: 0,
      lifeTimeEarned: 0.00,
      totalPurchases: 0,
      totalSpent: 0.00,
      depositAmount: 50 // Default add balance amount
    };
  }
  return db.users[userId];
}

// TATSER Branded Main Menu
function getMainMenuMarkup(user) {
  const usdBal = (user.balance / config.CURRENCY_RATE).toFixed(2);
  
  const welcomeText = 
`⚡ - <b>TATSER PANEL SHOP</b> - ⚡

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
      // 1. SHOP MENU
      else if (data === "shop") {
        const shopText = 
`🛒 <b>SELECT CATEGORY / PANEL</b>

🎮 <i>Choose your desired game panel below:</i>`;
        
        const shopMarkup = {
          inline_keyboard: [
            [{ text: "🎮 ANDROID NON ROOT", callback_data: "panel_phantom" }],
            [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
          ]
        };

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: shopText,
          parse_mode: "HTML",
          reply_markup: shopMarkup
        });
      }
      else if (data === "panel_phantom") {
        const packageText = 
`📦 <b>PHANTOM PANEL PACKAGES</b>

Select your plan duration:`;

        const packageMarkup = {
          inline_keyboard: [
            [{ text: "⏳ 1 Day - ₹50", callback_data: "buy_phantom_1d_50" }],
            [{ text: "⏳ 7 Days - ₹250", callback_data: "buy_phantom_7d_250" }],
            [{ text: "🔙 Back to Shop", callback_data: "shop" }]
          ]
        };

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: packageText,
          parse_mode: "HTML",
          reply_markup: packageMarkup
        });
      }
      // 2. DIRECT PURCHASE QR GENERATION
      else if (data.startsWith("buy_")) {
        const parts = data.split("_");
        const panel = parts[1];
        const duration = parts[2];
        const price = parts[3];
        const orderId = Math.floor(100000 + Math.random() * 900000);

        const upiId = "9114959377@fampay"; // Aapka UPI ID
        const qrCaption = 
`💳 <b>SCAN & PAY VIA UPI (FamPay)</b>

💰 <b>Amount:</b> ₹${price}
🆔 <b>Order ID:</b> <code>${orderId}</code>
📌 <b>UPI ID:</b> <code>${upiId}</code>

<i>Scan the QR below using any UPI app or pay directly to the UPI ID above, then click 'Check Payment'.</i>`;

        // Generates dynamic UPI QR Code via public API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${upiId}&pn=TATSER%20SHOP&am=${price}&cu=INR&tn=Order_${orderId}`;

        await axios.post(`${TELEGRAM_API}/sendPhoto`, {
          chat_id: chatId,
          photo: qrUrl,
          caption: qrCaption,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Check Payment", callback_data: `check_order_${orderId}_${price}` }],
              [{ text: "🔙 Cancel", callback_data: "main_menu" }]
            ]
          }
        });
      }
      // 3. ADD BALANCE MENU
      else if (data === "add_balance") {
        const balanceText = 
`💳 <b>ADD BALANCE TO WALLET</b>

Current Amount to Add: <b>₹${user.depositAmount || 50}</b>

<i>Select amount or click pay:</i>`;

        const balanceMarkup = {
          inline_keyboard: [
            [
              { text: "➕ ₹50", callback_data: "amt_50" },
              { text: "➕ ₹100", callback_data: "amt_100" },
              { text: "➕ ₹500", callback_data: "amt_500" }
            ],
            [{ text: "🚀 Proceed to Pay QR", callback_data: "amt_confirm" }],
            [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
          ]
        };

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: balanceText,
          parse_mode: "HTML",
          reply_markup: balanceMarkup
        });
      }
      else if (data.startsWith("amt_")) {
        if (data === "amt_confirm") {
          const amt = user.depositAmount || 50;
          const orderId = Math.floor(100000 + Math.random() * 900000);
          const upiId = "9114959377@fampay";
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${upiId}&pn=TATSER%20SHOP&am=${amt}&cu=INR&tn=Deposit_${orderId}`;

          await axios.post(`${TELEGRAM_API}/sendPhoto`, {
            chat_id: chatId,
            photo: qrUrl,
            caption: `💳 <b>ADD BALANCE QR</b>\n\nAmount: ₹${amt}\nOrder ID: <code>${orderId}</code>\n\nPay via FamPay and click below:`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Check Deposit", callback_data: `check_deposit_${orderId}_${amt}` }],
                [{ text: "🔙 Back", callback_data: "add_balance" }]
              ]
            }
          });
        } else {
          const amountVal = data.replace("amt_", "");
          user.depositAmount = parseInt(amountVal);
          
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: `✅ Amount updated to <b>₹${user.depositAmount}</b>. Click below to generate QR:`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Proceed to Pay QR", callback_data: "amt_confirm" }],
                [{ text: "🔙 Back", callback_data: "add_balance" }]
              ]
            }
          });
        }
      }
      // 4. REFERRAL & SUPPORT
      else if (data === "referral") {
        const inviteLink = `https://t.me/T4TSAR_NEW_SHOP_BOT?start=ref_${user.id}`;
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `🔗 <b>AFFILIATE PROGRAM</b>\n\nInvite friends and earn ₹0.50 per referral!\n\nYour Link:\n<code>${inviteLink}</code>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "support") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `📞 <b>24/7 CUSTOMER SUPPORT</b>\n\nFor any issues or key delivery, contact admin: @TATSER_SUPPORT`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "main_menu" }]] }
        });
      }
      else if (data === "profile") {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `👤 <b>PROFILE</b>\n\nID: <code>${user.id}</code>\nName: ${user.name}\nBalance: ₹${user.balance.toFixed(2)}`,
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
      // 5. ADMIN VERIFICATION & APPROVALS
      else if (data.startsWith("check_order_") || data.startsWith("check_deposit_")) {
        const parts = data.split("_");
        const orderId = parts[2];
        const amount = parts[3];
        
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: cq.id,
          text: "⏳ Payment verification request sent to admin!",
          show_alert: true
        });

        const ADMIN_CHAT_ID = "880513593"; // Aapki Admin Chat ID
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: ADMIN_CHAT_ID,
          text: `🔔 <b>NEW PAYMENT VERIFICATION</b>\n\n👤 User: ${user.name} (ID: <code>${user.id}</code>)\n🆔 Order: <code>${orderId}</code>\n💵 Amount: ₹${amount}`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Approve", callback_data: `approve_${user.id}_${amount}_${orderId}` },
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

        if (db.users[targetUserId]) {
          db.users[targetUserId].totalPurchases = (db.users[targetUserId].totalPurchases || 0) + 1;
          db.users[targetUserId].totalSpent = (db.users[targetUserId].totalSpent || 0) + amount;
        }

        await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
          chat_id: chatId,
          message_id: cq.message.message_id,
          caption: `✅ <b>Approved & Key Dispatched!</b>\nUser: ${targetUserId}\nAmount: ₹${amount}`,
          parse_mode: "HTML"
        }).catch(() => {});

        const sampleKey = `TATSER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: targetUserId,
          text: `✅ <b>Payment Successful!</b>\n\n🔑 Your License Key: <code>${sampleKey}</code>`,
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
          message_id: cq.message.message_id,
          caption: `❌ <b>Payment Rejected</b> (Order: ${orderId})`,
          parse_mode: "HTML"
        }).catch(() => {});

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
