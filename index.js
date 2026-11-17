const { Telegraf, Markup } = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

// In-memory database simulation (Aap ise MongoDB ya PostgreSQL se replace kar sakte hain)
const users = {};

// Helper function to get or create user profile
function getUser(userId, username = "User") {
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            name: username,
            balance: 15.00, // Default starting balance (Jaise screenshot mein hai)
            totalOrders: 3,
            totalSpent: 195.00,
            referrals: 0,
            joinedDate: new Date().toISOString().split('T')[0],
            lastSpin: null
        };
    }
    return users[userId];
}

// /start Command Handler
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId, ctx.from.first_name);

    const welcomeCaption = `
🌸 – **VETLAM PANEL SHOP** – 🌸

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

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛍️ Shop', 'shop_menu'), Markup.button.callback('💳 Add Balance', 'add_balance')],
        [Markup.button.callback('📦 My Orders', 'my_orders'), Markup.button.callback('👤 My Profile', 'my_profile')],
        [Markup.button.callback('🔗 Referral', 'referral_menu'), Markup.button.callback('🎲 Daily Spin', 'daily_spin')],
        [Markup.button.callback('🛠️ Support', 'support_menu')],
        [Markup.button.callback('💎 Selling Proof', 'selling_proof'), Markup.button.callback('📊 Leaderboard', 'leaderboard')]
    ]);

    try {
        await ctx.replyWithPhoto('https://files.catbox.moe/example.jpg', {
            caption: welcomeCaption,
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        // Fallback agar photo load na ho
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

    await ctx.editMessageCaption('🛒 **SELECT PRODUCT PANEL**\n\nChoose a panel to view its packages:', {
        parse_mode: 'Markdown',
        ...keyboard
    }).catch(() => ctx.editMessageText('🛒 **SELECT PRODUCT PANEL**\n\nChoose a panel to view its packages:', { parse_mode: 'Markdown', ...keyboard }));
});

// My Profile Handler
bot.action('my_profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id, ctx.from.first_name);

    const profileText = `
💂 – **YOUR SECURE PROFILE** – 💂

💂 **Grid ID:** \`${user.id}\`
👑 **Name:** ${user.name}
👔 **Account Level:** 👤 Regular User

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

    // Send QR Code image simulation
    await ctx.replyWithPhoto('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=merchant@paytm&am=158', {
        caption: qrCaption,
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Daily Spin / Lucky Dice Handler
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
    
    // Send Telegram built-in dice emoji animation
    const diceMessage = await ctx.replyWithDice({ emoji: '🎲' });
    const diceValue = diceMessage.dice.value; // Value between 1 to 6

    const user = getUser(ctx.from.id, ctx.from.first_name);
    const reward = diceValue * 0.20; // Calculate reward based on dice number
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

// Referral Menu Handler
bot.action('referral_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id);
    const botInfo = await bot.telegram.getMe();

    const refText = `
👥 **AFFILIATE PROGRAM** 👥

✅ **Status:** ACTIVE
💰 **Earn 15% flat commission on every successful purchase made by your referred friends!**

📊 **YOUR STATS:**
👥 **Total Invited:** ${user.referrals}
💵 **Life-time Earned:** ${config.CURRENCY_SYMBOL}0.00 (~$0.00)

🔗 **Your Invite Link:**
\`https://t.me/${botInfo.username}?start=ref_${user.id}\`

Simply copy and share this link to start earning!
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 BACK', 'back_to_home')]
    ]);

    await ctx.editMessageCaption(refText, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(refText, { parse_mode: 'Markdown', ...keyboard }));
});

// Support Menu
bot.action('support_menu', async (ctx) => {
    await ctx.answerCbQuery();
    const supportText = `
✈️📱 **– PREMIUM SUPPORT CENTER –**

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

// Back to Home Button
bot.action('back_to_home', async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(ctx.from.id, ctx.from.first_name);

    const welcomeCaption = `
🌸 – **VETLAM PANEL SHOP** – 🌸

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
        [Markup.button.callback('🛠️ Support', 'support_menu')],
        [Markup.button.callback('💎 Selling Proof', 'selling_proof'), Markup.button.callback('📊 Leaderboard', 'leaderboard')]
    ]);

    await ctx.editMessageCaption(welcomeCaption, { parse_mode: 'Markdown', ...keyboard })
        .catch(() => ctx.editMessageText(welcomeCaption, { parse_mode: 'Markdown', ...keyboard }));
});

// Dummy Placeholders for remaining buttons
bot.action(['my_orders', 'selling_proof', 'leaderboard', 'redeem_promo', 'open_ticket', 'my_tickets', 'cat_android_nonroot', 'cat_android_root', 'cat_iphone', 'cat_pc'], async (ctx) => {
    await ctx.answerCbQuery("Feature coming soon or under maintenance!", { show_alert: true });
});

// Start the Bot
bot.launch().then(() => {
    console.log("🤖 Bot is successfully running!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
