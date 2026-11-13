const config = require('./config');
const axios = require('axios');

// Jab user kisi package ke price button par click kare (jaise buy_myth_1h_14)
async function handleDirectPurchaseQR(user, chatId, callbackData, TELEGRAM_API) {
  // Callback data se details nikalna (jaise: buy_myth_1h_14 -> panel: myth, hours: 1h, price: 14)
  const parts = callbackData.split("_");
  const panelKey = parts[1];
  const validity = parts[2]; // 1h, 3h, 1d
  const price = parseFloat(parts[3]) || 14.00;

  const panelNames = {
    myth: "Myth Panel",
    phantom: "Phantom",
    prime: "Prime Hook",
    drip: "Drip Client",
    xreg: "Xreg Apk",
    drake: "Drake Panel",
    aim: "Aim Hack"
  };

  const productName = `${panelNames[panelKey] || panelKey.toUpperCase()} (${validity.replace('h', ' hours').replace('d', ' days')})`;
  const orderId = `PTM${user.id}${Date.now().toString().slice(-8)}`;
  const usdPrice = (price / config.CURRENCY_RATE).toFixed(2);

  // Aapki FamPay UPI ID (`9694421148@fam`) ke sath dynamic amount link
  const upiId = "9694421148@fam";
  const payeeName = "TatserShop";
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${price}&cu=INR&tn=${orderId}`;
  
  // QR Code generate karne ka URL
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;

  const captionText = 
`🛒 <b>DIRECT PURCHASE QR</b> 🛒

📦 <b>Product:</b> ${productName}
💵 <b>Pay Remaining:</b> ₹${price.toFixed(2)} (~$${usdPrice})
🆔 <b>Order ID:</b> <code>${orderId}</code>

⏳ <b>Wait! Scanning for payment automatically...</b>
⚠️ <i>Note: This QR will expire in 3 minutes.</i>
📦 Product will be delivered here instantly on payment.`;

  // Telegram par Photo (QR) bhejte hain
  const sentMsg = await axios.post(`${TELEGRAM_API}/sendPhoto`, {
    chat_id: chatId,
    photo: qrImage,
    caption: captionText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Check Payment", callback_data: `check_order_${orderId}_${price}`, style: "success" }],
        [{ text: "🔙 Cancel / Back", callback_data: "shop", style: "danger" }]
      ]
    }
  });

  const messageId = sentMsg.data.result.message_id;

  // 🕒 3 Minutes Timeout Logic (Agar 3 min mein payment na ho)
  setTimeout(async () => {
    try {
      await axios.post(`${TELEGRAM_API}/editMessageCaption`, {
        chat_id: chatId,
        message_id: messageId,
        caption: 
`⌛ <b>Deposit Timed Out!</b>

──────────────────
💵 <b>Deposit Amount:</b> ₹${price.toFixed(2)} (~$${usdPrice})
🆔 <b>Order ID:</b> <code>${orderId}</code>
──────────────────

Please try again if you still want to complete your purchase.`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 BACK TO PANELS", callback_data: "shop", style: "danger" }]
          ]
        }
      });
    } catch (err) {
      // Message already deleted/handled
    }
  }, 3 * 60 * 1000); // 3 Minutes
}

module.exports = { handleDirectPurchaseQR };
