const { Telegraf, Markup } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

// In-memory database simulation for users
const users = {};

// Helper function to get or create user profile
function getUser(userId, username = "User") {
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            name: username,
            balance: 15.00,
            totalOrders: 3,
            totalSpent: 195.00,
            referrals: 0,
            joinedDate: "2026-10-23 21:23:31",
            ordersList: [
                { name: "PHANTOM Android+ IOS", count: 7, spent: 316 },
                { name: "AIM HACK", count: 1, spent: 65 },
                { name: "DRIP CLIENT APK MOD", count: 1, spent: 30 }
            ]
        };
    }
    return users[userId];
}

// /start Command Handler (with referral tracking support)
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId, ctx.from.first_name);

    // Check for referral parameter e.g., /start ref_8805135936
    const payload = ctx.startPayload;
    if (payload && payload.startsWith('ref_')) {
        const referrerId = parseInt(payload.replace('ref_', ''));
        if (referrerId && referrerId !== userId && users[referrerId]) {
            // Check if user is new (joined today or just created)
            if (!user.referredBy) {
                user.referredBy = referrerId;
                users[referrerId].referrals += 1;
            }
        }
    }

    const welcomeCaption = `
🌸 – **TATSER SHOP** – 🌸

🌺 Hello, \`${user.name}\` ⚡

🪐 Premium digital keys, instant delivery.

— 🛍️ **Wide product catalog**
— ⚡ **Instant key delivery**
— 💳 **Multiple payment gateways**
— 🎁 **Referrals & spin-to-win**
— 🛡️ **24/7 admin support**

Tap any button below to begin.

🆔 **User ID:** \`${user.id}\`
💰 **Wallet Balance:** ${config.CURRENCY_SYMBOL}${user.balance.toFixed(2)} (~$${(user.balance / 85).toFixed(2)})
    `;

    // Updated Keyboard without Proof and Leaderboard
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛍️ Shop', 'shop_menu'), Markup.button.callback('💳 Add Balance', 'add_balance')],
        [Markup.button.callback('📦 My Orders', 'my_orders'), Markup.button.callback('👤 My Profile', 'my_profile')],
        [Markup.button.callback('🔗 Referral', 'referral_menu'), Markup.button.callback('🎲 Daily Spin', 'daily_spin')],
        [Markup.button.callback('🛠️ Support', 'support_menu')]
    ]);

    try {
        await ctx.replyWithPhoto('https://files.catbox.moe/example.jpg', {
            caption: welcomeCaption,
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        await ctx.reply(welcomeCaption, { parse_mode: 'Markdown', ...keyboard });
    }
});

// Shop Menu
bot.action('shop_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🤖 ANDROID NON ROOT PANEL', 'cat_android_nonroot')],
        [Markup.button.callback('👑 ANDROID ROOT PANEL', 'cat_android_root')],
        [Markup.button.callback('🍏 IPHONE PANEL', 'cat_iphone')],
        [Markup.button.callback('💻 PC PANEL', 'cat_pc')],
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    const text = '🛒 **SELECT PRODUCT PANEL**\n\nChoose a panel to view its packages:';
    await ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }));
});

// My Profile Handler (Customized as requested in image 7132_2.png)
bot.action('my_profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id, ctx.from.first_name);

    const profileText = `
💂 – **YOUR SECURE PROFILE** – 💂

💂 **Grid ID:** \`${user.id}\`
👑 **Name:** ${user.name}
💼 **Account Level:** 👤 Regular User

💰 – **Wallet** – 🍀
🍀 **Current Balance:** ${config.CURRENCY_SYMBOL}${user.balance.toFixed(2)} (~$${(user.balance / 85).toFixed(2)}) 🍀

✅ – **Global Statistics** –
🔑 **Total Orders:** ${user.totalOrders}
🛒 **Total Spent:** ${config.CURRENCY_SYMBOL}${user.totalSpent}.00 (~$${(user.totalSpent / 85).toFixed(2)})
👥 **Total Referrals:** ${user.referrals}

📅 **Joined Grid:** ${user.joinedDate}
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎟️ Redeem Promo Code', 'redeem_promo')],
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    await ctx.editMessageCaption(profileText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(profileText, { parse_mode: 'Markdown', ...keyboard }));
});

// My Orders Handler (Customized as requested in image 7129_2.png)
bot.action('my_orders', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id, ctx.from.first_name);

    let totalPurchasesCount = user.ordersList.reduce((acc, item) => acc + item.count, 0);
    let totalSpentAmount = user.ordersList.reduce((acc, item) => acc + item.spent, 0);

    const orderText = `
📅 **MY ORDERS**

🛒 **Total Purchases:** ${totalPurchasesCount}
💰 **Total Spent:** ${config.CURRENCY_SYMBOL}${totalSpentAmount}

👉 **Product select karo**
    `;

    let orderButtons = [
        [Markup.button.callback('📋 All Orders', 'all_orders')]
    ];

    user.ordersList.forEach(order => {
        orderButtons.push([Markup.button.callback(`💀 ${order.name} • ${order.count} Purchases • ₹${order.spent}`, 'dummy_action')]);
    });

    orderButtons.push([Markup.button.callback('🔙 Back', 'back_to_home')]);

    const keyboard = Markup.inlineKeyboard(orderButtons);

    await ctx.editMessageCaption(orderText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(orderText, { parse_mode: 'Markdown', ...keyboard }));
});

// Referral / Affiliate Program Handler (Customized with TATSER_SHOP link as requested)
bot.action('referral_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id);
    const botUsername = "TATSER_SHOP"; // Aapka bot username

    const refText = `
👥 **AFFILIATE PROGRAM** 👥

✅ **Status:** ACTIVE
💰 **Earn 15% flat commission on every successful purchase made by your referred friends!**

📊 **YOUR STATS:**
👥 **Total Invited:** ${user.referrals}
💵 **Life-time Earned:** ${config.CURRENCY_SYMBOL}0.00 (~$0.00)

🔗 **Your Invite Link:**
\`https://t.me/${botUsername}?start=ref_${user.id}\`

Simply copy and share this link to start earning!
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    await ctx.editMessageCaption(refText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(refText, { parse_mode: 'Markdown', ...keyboard }));
});

// Support Menu Handler (Customized as requested in image 7137_2.png)
bot.action('support_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const supportText = `
✈️🟢 **– PREMIUM SUPPORT CENTER –**

Contact us via Telegram or WhatsApp for instant help, or open a support ticket for admin assistance.
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('✈️ Contact on Telegram', config.SUPPORT_LINK)],
        [Markup.button.url('🟢 Contact on WhatsApp', config.WHATSAPP_SUPPORT)],
        [Markup.button.callback('🎟️ Open New Ticket', 'open_ticket'), Markup.button.callback('📋 My Open Tickets', 'my_tickets')],
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    await ctx.editMessageCaption(supportText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(supportText, { parse_mode: 'Markdown', ...keyboard }));
});

// Add Balance / QR Payment Handler
bot.action('add_balance', async (ctx) => {
    await ctx.answerCbQuery();
    
    const qrCaption = `
💰 **AUTO PAYMENT SYSTEM** 💰

💵 **Amount:** ${config.CURRENCY_SYMBOL}158.00
🆔 **Order ID:** PTM${ctx.from.id}${Date.now().toString().slice(-8)}

⏳ **Wait! Scanning for your payment automatically...**
⚠️ **Note: This QR will expire in 3 minutes.**
❌ **Do not click any buttons, just pay!**
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Cancel / Back', 'back_to_home')]
    ]);

    await ctx.replyWithPhoto('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=merchant@paytm&am=158', {
        caption: qrCaption,
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Daily Spin Handler
bot.action('daily_spin', async (ctx) => {
    await ctx.answerCbQuery();
    
    const spinText = `
🎲 **LUDO SPIN / LUCKY DICE** 🎁

Test your luck! You can spin once every 24 hours.
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎲 Spin Dice Now!', 'trigger_dice')],
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    await ctx.editMessageCaption(spinText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(spinText, { parse_mode: 'Markdown', ...keyboard }));
});

// Trigger Telegram Dice Animation
bot.action('trigger_dice', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    
    const diceMessage = await ctx.replyWithDice({ emoji: '🎲' });
    const diceValue = diceMessage.dice.value;

    const user = getUser(ctx.from.id, ctx.from.first_name);
    const reward = diceValue * 0.20;
    user.balance += reward;

    setTimeout(async () => {
        await ctx.reply(`
🎁 **LUCKY DICE RESULT** ⛏️ 💯

🎲 **Dice Value:** ${diceValue}
🌿 **You Won:** ${config.CURRENCY_SYMBOL}${reward.toFixed(2)} (~$0.00)
💰 **Total Balance:** ${config.CURRENCY_SYMBOL}${user.balance.toFixed(2)} (~$${(user.balance / 85).toFixed(2)})

Congratulations! Come back after 24 hours.
        `, Markup.inlineKeyboard([
            [Markup.button.callback('📚 BACK TO MENU', 'back_to_home')]
        ]));
    }, 3000);
});

// Back to Home Button
bot.action('back_to_home', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id, ctx.from.first_name);

    const welcomeCaption = `
🌸 – **TATSER SHOP** – 🌸

🌺 Hello, \`${user.name}\` ⚡

🪐 Premium digital keys, instant delivery.
Tap any button below to begin.

🆔 **User ID:** \`${user.id}\`
💰 **Wallet Balance:** ${config.CURRENCY_SYMBOL}${user.balance.toFixed(2)}
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛍️ Shop', 'shop_menu'), Markup.button.callback('💳 Add Balance', 'add_balance')],
        [Markup.button.callback('📦 My Orders', 'my_orders'), Markup.button.callback('👤 My Profile', 'my_profile')],
        [Markup.button.callback('🔗 Referral', 'referral_menu'), Markup.button.callback('🎲 Daily Spin', 'daily_spin')],
        [Markup.button.callback('🛠️ Support', 'support_menu')]
    ]);

    await ctx.editMessageCaption(welcomeCaption, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(welcomeCaption, { parse_mode: 'Markdown', ...keyboard }));
});

// Dummy Placeholder for actions under development
bot.action(['dummy_action', 'all_orders', 'redeem_promo', 'open_ticket', 'my_tickets', 'cat_android_nonroot', 'cat_android_root', 'cat_iphone', 'cat_pc'], async (ctx) => {
    await ctx.answerCbQuery("Feature coming soon or under maintenance!", { show_alert: true });
});

// Start Bot
bot.launch().then(() => {
    console.log("🤖 TATSER SHOP Bot is successfully running!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
