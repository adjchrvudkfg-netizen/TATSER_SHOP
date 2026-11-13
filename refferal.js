const config = require('./config');

// 🔗 AFFILIATE / REFERRAL MODULE
function getReferralMenu(user) {
  const usdEarned = (user.lifeTimeEarned / config.CURRENCY_RATE).toFixed(2);
  
  // Aapke bataye hue bot link ke sath referral tracking format
  const inviteLink = `https://t.me/T4TSAR_NEW_SHOP_BOT?start=ref_${user.id}`;

  const resText = 
`🔗 <b>AFFILIATE PROGRAM</b>

✅ <b>Status: ACTIVE</b>
💰 <b>Earn ₹0.50 instant balance</b> on every new user who joins via your invite link!

📊 <b>YOUR STATS:</b>
👥 <b>Total Invited:</b> ${user.totalReferrals || 0}
💵 <b>Life-time Earned:</b> ₹${(user.lifeTimeEarned || 0).toFixed(2)} (~$${usdEarned})

🔗 <b>Your Invite Link:</b>
<code>${inviteLink}</code>

<i>Simply copy and share this link to start earning!</i>`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🔙 BACK", callback_data: "main_menu", style: "danger" }]
    ]
  };

  return { resText, reply_markup };
}

// Jab koi naya user /start?ref_XYZ ke zariye bot join kare
function handleNewReferral(newUserId, referrerId, usersDb) {
  if (referrerId && usersDb[referrerId] && referrerId !== newUserId.toString()) {
    const referrer = usersDb[referrerId];
    
    // Check karo ki yeh user pehle refer ho chuka hai ya nahi
    if (!referrer.referredUsers) referrer.referredUsers = [];
    if (!referrer.referredUsers.includes(newUserId)) {
      referrer.referredUsers.push(newUserId);
      
      // ₹1 se kam (jaise ₹0.50) reward add karo
      const reward = 0.50;
      referrer.balance += reward;
      referrer.lifeTimeEarned = (referrer.lifeTimeEarned || 0) + reward;
      referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
      
      return true; // Success
    }
  }
  return false;
}

module.exports = { getReferralMenu, handleNewReferral };
