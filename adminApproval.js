const axios = require('axios');
const { getNextKey } = require('./keysdata'); // Keys stock file require ki gayi hai

// 1. Jab user QR ke neeche "Check Payment" par click kare
async function handleCheckPayment(callbackQuery, TELEGRAM_API) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data; // format: check_order_ORDERID_PRICE
  const parts = data.split("_");
  
  const orderId = parts[2];
  const amount = parts[3];
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name || "User";

  // User ko notification dena ki request bhej di gayi hai
  await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
    callback_query_id: callbackQuery.id,
    text: "⏳ Payment check ki ja rahi hai! Admin verification ke baad key mil jayegi.",
    show_alert: true
  });

  // Aap yahan apna Admin Telegram Chat ID daal sakte hain
  const ADMIN_CHAT_ID = "YOUR_ADMIN_TELEGRAM_ID"; 

  const adminText = 
`🔔 <b>NEW PAYMENT VERIFICATION REQUEST</b> 🔔

👤 <b>User:</b> ${userName} (ID: <code>${userId}</code>)
🆔 <b>Order ID:</b> <code>${orderId}</code>
💵 <b>Amount:</b> ₹${amount}

Kripya apna FamPay check karein aur neeche diye button se approve ya reject karein:`;

  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: ADMIN_CHAT_ID,
    text: adminText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve & Send Key", callback_data: `approve_${userId}_${amount}_${orderId}_phantom_1d`, style: "success" },
          { text: "❌ Reject", callback_data: `reject_${userId}_${orderId}`, style: "danger" }
        ]
      ]
    }
  });
}

// 2. Jab Admin "Approve" par click kare
async function handleAdminApproval(callbackQuery, TELEGRAM_API, usersDb) {
  const data = callbackQuery.data; // format: approve_userId_amount_orderId_panelKey_duration
  const parts = data.split("_");
  const targetUserId = parts[1];
  const amount = parseFloat(parts[2]);
  const orderId = parts[3];
  const panelKey = parts[4] || "phantom";
  const duration = parts[5] || "1d";

  // User ka stats update karein
  if (usersDb && usersDb[targetUserId]) {
    usersDb[targetUserId].totalPurchases = (usersDb[targetUserId].totalPurchases || 0) + 1;
    usersDb[targetUserId].totalSpent = (usersDb[targetUserId].totalSpent || 0) + amount;
  }

  // Admin ke message ko update karein
  await axios.post(`${TELEGRAM_API}/editMessageText`, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    text: `✅ <b>Payment Approved & Key Dispatched!</b>\n\nUser ID: ${targetUserId}\nAmount: ₹${amount}\nOrder ID: ${orderId}`,
    parse_mode: "HTML"
  });

  // Stock mein se valid key nikalna
  const licenseKey = getNextKey(panelKey, duration);

  // User ko successful purchase aur key bhejna
  const userSuccessMessage = 
`✅ <b>Payment Successful!</b>

🎮 <b>Game:</b> ANDROID NON ROOT PANEL
⏳ <b>Duration:</b> ${duration.toUpperCase()}
📦 <b>Quantity:</b> 1
🔑 <b>Key:</b> <code>${licenseKey}</code>

🙏 <i>Thank you for your purchase!</i>`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: targetUserId,
      text: userSuccessMessage,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Menu", callback_data: "main_menu", style: "success" }]
        ]
      }
    });
  } catch (err) {
    console.log("Could not message user directly:", err);
  }
}

// 3. Jab Admin "Reject" par click kare
async function handleAdminRejection(callbackQuery, TELEGRAM_API) {
  const data = callbackQuery.data; // format: reject_userId_orderId
  const parts = data.split("_");
  const targetUserId = parts[1];
  const orderId = parts[2];

  await axios.post(`${TELEGRAM_API}/editMessageText`, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    text: `❌ <b>Payment Rejected!</b>\n\nUser ID: ${targetUserId}\nOrder ID: ${orderId}`,
    parse_mode: "HTML"
  });

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: targetUserId,
      text: `❌ <b>Payment Verification Failed!</b>\n\nAapka payment Order ID: <code>${orderId}</code> verify nahi ho paya. Kripya support se contact karein.`,
      parse_mode: "HTML"
    });
  } catch (err) {
    console.log("Could not message user directly.");
  }
}

module.exports = { handleCheckPayment, handleAdminApproval, handleAdminRejection };
