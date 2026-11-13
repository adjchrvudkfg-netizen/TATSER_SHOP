function getDynamicOrdersMenu(user) {
  const purchases = user.totalPurchases || 0;
  const spent = user.totalSpent || 0;

  const resText = 
`🗓️ <b>MY ORDERS</b>

🛒 <b>Total Purchases:</b> ${purchases}
💸 <b>Total Spent:</b> ₹${spent}

👇 <b>Product select karo</b>`;

  // Base buttons
  let keyboard = [
    [{ text: "📋 All Orders", callback_data: "all_orders", style: "success" }]
  ];

  // User ne jo-jo products kharide hain, unke hisab se dynamic green buttons add honge
  if (user.purchasedProducts) {
    for (const [prodName, data] of Object.entries(user.purchasedProducts)) {
      keyboard.push([
        { 
          text: `📦 ${prodName} • ${data.count} Purchases • ₹${data.spent}`, 
          callback_data: `order_detail_${prodName}`, 
          style: "success" 
        }
      ]);
    }
  }

  // Back button
  keyboard.push([{ text: "🔙 Back", callback_data: "main_menu", style: "primary" }]);

  return { resText, reply_markup: { inline_keyboard: keyboard } };
}
