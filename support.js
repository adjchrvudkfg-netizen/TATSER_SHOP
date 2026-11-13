// 📞 SUPPORT CENTER MODULE (TATSER Update)
function getSupportMenu() {
  const resText = 
`💬 <b>SUPPORT CENTER</b> 💬

👋 <b>Need Any Help?</b>

🔹 <b>Purchase Support</b>
💳 <b>Payment Issues</b>
🔑 <b>Key Problems</b>
⚡ <b>Instant Assistance</b>

──────────────────
🛡️ <b>Admin:</b> @ADITYACHOUDHARY5 👑
       <b>24x7 Active Support</b>
──────────────────

⚠️ <b>Contact Admin If:</b>

👉 <b>Balance nahi aaya</b>
👉 <b>Key nahi mila</b>
👉 <b>Purchase problem</b>

🔥 <b>Fast Reply • Trusted Support</b> ✅`;

  // Screenshot ke mutabiq exact buttons (Chat on Telegram aur Back to Home)
  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✈️ Chat on Telegram", url: "https://t.me/ADITYACHOUDHARY5", style: "success" }
      ],
      [
        { text: "🔙 Back to Home", callback_data: "main_menu", style: "primary" }
      ]
    ]
  };

  return { resText, reply_markup };
}

module.exports = { getSupportMenu };
