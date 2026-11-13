const panelData = require('./panelsData');

// 🛍️ Main Shop Menu
function getShopMenu() {
  const resText = 
`🛒 <b>ANDROID NON ROOT PANELS</b>

✅ <b>Choose a panel name:</b>`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "💚 Prime Hook", callback_data: "panel_prime", style: "success" }],
      [{ text: "💧 Drip Wire", callback_data: "panel_drip", style: "success" }],
      [{ text: "⚡ Xreg Apk", callback_data: "panel_xreg", style: "success" }],
      [{ text: "🔥 Phantom", callback_data: "panel_phantom", style: "success" }],
      [{ text: "💧 Drake Panel", callback_data: "panel_drake", style: "success" }],
      [{ text: "🎯 Aim Hack", callback_data: "panel_aim", style: "success" }],
      [{ text: "🌀 MYTH PANEL", callback_data: "panel_myth", style: "success" }],
      [{ text: "🔙 BACK TO PANELS", callback_data: "main_menu", style: "success" }]
    ]
  };

  return { resText, reply_markup };
}

// 📦 Jab user kisi panel par click kare, toh uske alag prices wala page khule
function getPanelPackages(panelKey) {
  const panel = panelData[panelKey];
  
  if (!panel) {
    return {
      resText: "❌ <b>Panel details not found!</b>",
      reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "shop" }]]]
    };
  }

  let packagesText = "";
  let inlineKeyboard = [];

  // Har package ke liye text aur button dynamically generate hoga
  panel.packages.forEach(pkg => {
    const usdPrice = (pkg.price / 93.75).toFixed(2);
    packagesText += `⏱ <b>Validity: ${pkg.hours}</b>\n💰 Price: ₹${pkg.price.toFixed(2)} (~ $${usdPrice})\n📱 Limit: 1 Device | 📦 In Stock\n\n`;
    
    inlineKeyboard.push([
      { text: `🛒 Buy ${pkg.hours} - ₹${pkg.price.toFixed(2)}`, callback_data: pkg.callback, style: "success" }
    ]);
  });

  inlineKeyboard.push([{ text: "🔙 BACK TO PANELS", callback_data: "shop", style: "primary" }]);

  const resText = 
`🛒 <b>ANDROID NON ROOT PANEL - ${panel.title} PACKAGES</b>

${packagesText}✅ <b>Select package below to instantly purchase:</b>`;

  return { resText, reply_markup: { inline_keyboard: inlineKeyboard } };
}

module.exports = { getShopMenu, getPanelPackages };
