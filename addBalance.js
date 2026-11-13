const config = require('./config');

const userSessions = {};

// 1. Keypad Menu
function getAddBalanceMenu(userId) {
  const currentAmount = userSessions[userId] || 0;
  const usdAmount = (currentAmount / config.CURRENCY_RATE).toFixed(2);

  const resText = 
`🏛️ <b>Custom Amount</b>

──────────────────
Method: 🟢 <b>UPI (FamPay - Auto)</b>
Min: ₹1 | Max: ₹5,000
──────────────────

Apna amount enter karo aur payment complete karke balance add karwao.

🔽 <b>Amount: ₹${currentAmount} (~$${usdAmount})</b>

🔽 <b>Amount type karo – buttons se:</b>`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "💰 1", callback_data: "amt_1", style: "success" },
        { text: "💰 2", callback_data: "amt_2", style: "success" },
        { text: "💰 3", callback_data: "amt_3", style: "success" }
      ],
      [
        { text: "💰 4", callback_data: "amt_4", style: "success" },
        { text: "💰 5", callback_data: "amt_5", style: "success" },
        { text: "💰 6", callback_data: "amt_6", style: "success" }
      ],
      [
        { text: "💰 7", callback_data: "amt_7", style: "success" },
        { text: "💰 8", callback_data: "amt_8", style: "success" },
        { text: "💰 9", callback_data: "amt_9", style: "success" }
      ],
      [
        { text: "❌ Delete", callback_data: "amt_del", style: "danger" },
        { text: "💰 0", callback_data: "amt_0", style: "success" },
        { text: "✅ Confirm", callback_data: "amt_confirm", style: "success" }
      ],
      [
        { text: "🔙 Back", callback_data: "main_menu", style: "primary" }
      ]
    ]
  };

  return { resText, reply_markup };
}

// Keypad input handler
function handleKeypadInput(userId, action) {
  if (!userSessions[userId]) userSessions[userId] = "0";

  if (action.startsWith("amt_") && action !== "amt_confirm" && action !== "amt_del") {
    const digit = action.split("_")[1];
    if (userSessions[userId] === "0") {
      userSessions[userId] = digit;
    } else {
      userSessions[userId] += digit;
    }
  } else if (action === "amt_del") {
    userSessions[userId] = userSessions[userId].slice(0, -1) || "0";
  }

  return parseInt(userSessions[userId], 10) || 0;
}

// 2. Har baar user ke amount ke hisab se Naya QR Generate karna
async function generatePaymentQR(user, chatId, TELEGRAM_API, axios) {
  const amount = parseInt(userSessions[user.id], 10);
  
  if (!amount || amount <= 0) {
    return axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "❌ <b>Kripya kam se kam ₹1 enter karein!</b>",
      parse_mode: "HTML"
    });
  }

  const orderId = `PTM${user.id}${Date.now().toString().slice(-8)}`;
  const usdAmount = (amount / config.CURRENCY_RATE).toFixed(2);

  // Reset session amount
  userSessions[user.id] = "0";

  // Aapki FamPay UPI ID (`9694421148@fam`) ke sath dynamic amount link
  const upiId = "9694421148@fam";
  const payeeName = "TatserShop";
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${orderId}`;
  
  // QR Code API jo is UPI link ka QR image banayegi
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;

  const captionText = 
`<b>⏳ AUTO PAYMENT SYSTEM ⏳</b>

💰 <b>Amount:</b> ₹${amount}.00 (~$${usdAmount})
🆔 <b>Order ID:</b> <code>${orderId}</code>

<b>Wait! Scanning for your payment automatically...</b>
⚠️ <i>Note: This QR will expire in 3 minutes.</i>
❌ <b>Do not click any buttons, just pay!</b>`;

  // Send Photo with Dynamic Amount QR
  const sentMsg = await axios.post(`${TELEGRAM_API}/sendPhoto`, {
    chat_id: chatId,
    photo: qrImage,
    caption: captionText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Check Payment", callback_data: `check_deposit_${orderId}_${amount}`, style: "success" }],
        [{ text: "🔙 Cancel / Back", callback_data: "main_menu", style: "danger" }]
      ]
    }
  });

  const messageId = sentMsg.data.result.message_id;

  // 🕒 3 Minutes Timeout Logic
  setTimeout(async () => {
    try {
      await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
        chat_id: chatId,
        message_id: messageId,
        caption: 
`⌛ <b>Deposit Timed Out!</b>

──────────────────
💵 <b>Deposit Amount:</b> ₹${amount}.00 (~$${usdAmount})
🆔 <b>Order ID:</b> <code>${orderId}</code>
──────────────────

Please try again if you still want to add balance.`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 BACK", callback_data: "add_balance", style: "danger" }]
          ]
        }
      });
    } catch (err) {
      // Ignore if message deleted/edited
    }
  }, 3 * 60 * 1000); // 3 Minutes
}

module.exports = { getAddBalanceMenu, handleKeypadInput, generatePaymentQR };
const axios = require('axios');

// Yahan apna Admin Telegram Chat ID daalein jiske paas approval message jayega
const ADMIN_CHAT_ID = "YOUR_ADMIN_TELEGRAM_ID"; 

// 1. Jab user "Check Payment" par click kare
async function handleCheckPayment(callbackQuery, TELEGRAM_API) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data; // format: check_order_ORDERID_PRICE ya check_deposit_...
  const parts = data.split("_");
  
  // Order ID aur Amount extract karna
  const orderId = parts[2];
  const amount = parts[3];
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name || "User";

  // User ko turant message dikhayein ki request admin ko bhej di gayi hai
  await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
    callback_query_id: callbackQuery.id,
    text: "⏳ Payment check ki ja rahi hai! Admin verification ke baad balance/key mil jayegi.",
    show_alert: true
  });

  // 2. Admin ke paas approval notification bhejna
  const adminText = 
`🔔 <b>NEW PAYMENT VERIFICATION REQUEST</b> 🔔

👤 <b>User:</b> ${userName} (ID: <code>${userId}</code>)
🆔 <b>Order ID:</b> <code>${orderId}</code>
💵 <b>Amount:</b> ₹${amount}

Kripya apna FamPay check karein ki payment aayi hai ya nahi, phir neeche diye button se approve karein:`;

  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: ADMIN_CHAT_ID,
    text: adminText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve & Add", callback_data: `approve_${userId}_${amount}_${orderId}`, style: "success" },
          { text: "❌ Reject", callback_data: `reject_${userId}_${orderId}`, style: "danger" }
        ]
      ]
    }
  });
}

// 3. Jab Admin "Approve" par click kare
async function handleAdminApproval(callbackQuery, TELEGRAM_API, usersDb) {
  const data = callbackQuery.data; // format: approve_userId_amount_orderId
  const parts = data.split("_");
  const targetUserId = parts[1];
  const amount = parseFloat(parts[2]);
  const orderId = parts[3];

  // User ka balance update karein (agar user database mein hai)
  if (usersDb && usersDb[targetUserId]) {
    usersDb[targetUserId].balance = (usersDb[targetUserId].balance || 0) + amount;
    usersDb[targetUserId].totalSpent = (usersDb[targetUserId].totalSpent || 0) + amount;
    usersDb[targetUserId].totalOrders = (usersDb[targetUserId].totalOrders || 0) + 1;
  }

  // Admin ke message ko update kar dein taaki pata chale approve ho gaya hai
  await axios.post(`${TELEGRAM_API}/editMessageText`, {
    chat_id: callbackQuery.message.chat.id,
    message_id: callbackQuery.message.message_id,
    text: `✅ <b>Payment Approved Successfully!</b>\n\nUser ID: ${targetUserId}\nAmount: ₹${amount}\nOrder ID: ${orderId}`,
    parse_mode: "HTML"
  });

  // User ko notification bhej dein ki payment successful ho gayi hai
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: targetUserId,
      text: `🎉 <b>Payment Verified & Successful!</b>\n\n₹${amount} has been added to your account / Order (ID: ${orderId}) has been processed.`,
      parse_mode: "HTML"
    });
  } catch (err) {
    console.log("Could not message user directly.");
  }
}

// 4. Jab Admin "Reject" par click kare
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
      text: `❌ <b>Payment Verification Failed!</b>\n\nAapka payment Order ID: <code>${orderId}</code> verify nahi ho paya ya amount match nahi hua. Kripya support se contact karein.`,
      parse_mode: "HTML"
    });
  } catch (err) {
    console.log("Could not message user directly.");
  }
}

module.exports = { handleCheckPayment, handleAdminApproval, handleAdminRejection };

