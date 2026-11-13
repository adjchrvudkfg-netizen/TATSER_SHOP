const config = require('./config');

// 👤 USER PROFILE MODULE
function getProfileResponse(user) {
  const usdBalance = (user.balance / config.CURRENCY_RATE).toFixed(2);
  const usdSpent = (user.totalSpent / config.CURRENCY_RATE).toFixed(2);

  const resText = 
`🛡️ <b>— YOUR SECURE PROFILE —</b> 🛡️

👤 <b>Grid ID:</b> <code>${user.id}</code>
👑 <b>Name:</b> ${user.name}
💼 <b>Account Level:</b> 🥷 ${user.accountLevel || 'Regular User'}

💰 <b>— Wallet —</b>
🍀 <b>Current Balance:</b> ₹${user.balance.toFixed(2)} (~$${usdBalance}) 🍀

📈 <b>— Global Statistics —</b>
🔑 <b>Total Orders:</b> ${user.totalOrders}
💸 <b>Total Spent:</b> ₹${user.totalSpent.toFixed(2)} (~$${usdSpent})
👥 <b>Total Referrals:</b> ${user.totalReferrals}

📅 <b>Joined Grid:</b> ${user.joined}`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🧧 Redeem Promo Code", callback_data: "redeem_promo", style: "success" }],
      [{ text: "🔙 BACK", callback_data: "main_menu", style: "primary" }]
    ]
  };

  return { resText, reply_markup };
}

// Jab user koi product kharidega ya payment karega, tab yeh function stats ko update kar dega
function recordPurchase(user, amount) {
  user.balance -= amount;
  user.totalSpent += amount;
  user.totalOrders += 1;
  return user;
}

module.exports = { getProfileResponse, recordPurchase };
