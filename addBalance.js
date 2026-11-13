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
