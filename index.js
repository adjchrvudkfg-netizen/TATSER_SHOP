const express = require('express');
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config');

const app = express();
app.use(express.json());

const TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = 8805135936;
const UPI_ID = "9694421148@fam";
const SUPPORT_CHANNEL = "https://t.me/adityachoudhary5";

// 🌍 MongoDB Atlas Connection (Permanent Data Storage)
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Connected successfully to MongoDB Atlas!"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err
));
.then(() => console.log("✅ Connected successfully to MongoDB Atlas!"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 📊 Database Schema (Data won't auto-delete)
const shopSchema = new mongoose.Schema({
    settingsId: { type: String, default: "main_shop" },
    products: {
        type: Object,
        default: {
            drake: "🔥 Drake Panel",
            myth: "⚡ Myth Mod",
            primehook: "🍏 PRIME HOOK",
            phantom: "☠️ PHANTOM Android+ IOS 🔴",
            aimhack: "🎯 AIM HACK ⚔️",
            dripclient: "👾 DRIP CLIENT APK MOD",
            xreg: "📱 X - REG FF { MAIN ID SAFE } 🔴"
        }
    },
    balances: { type: Map, of: Number, default: {} },
    keys: { type: Map, of: Array, default: {} },
    maintenance: { type: Boolean, default: false }
});

const ShopModel = mongoose.model('ShopData', shopSchema);

// 🔄 Helper function to get or create database state safely
async function getDb() {
    let data = await ShopModel.findOne({ settingsId: "main_shop" });
    if (!data) {
        data = await ShopModel.create({ settingsId: "main_shop" });
    }
    return data;
}

// 📢 /update Command Handler (With Decorated Message & Support Button)
// Note: Agar aap Telegraf ya koi specific bot library use kar rahe hain, toh uske handler ke mutabiq ise rakh sakte hain.
app.post(`/bot\${TOKEN}`, async (req, res) => {
    try {
        const update = req.body;
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const userId = update.message.from.id;
            const text = update.message.text;

            // /update command logic
            if (text.startsWith('/update')) {
                if (userId !== ADMIN_ID) {
                    await axios.post(`\${TELEGRAM_API}/sendMessage`, {
                        chat_id: chatId,
                        text: "❌ Aap admin nahi hain!"
                    });
                    return res.sendStatus(200);
                }

                const updateMessage = `╔═══════════════════════╗\n      📢 𝗦𝗛𝗢𝗣 𝗨𝗣𝗗𝗔𝗧𝗘 📢\n╚═══════════════════════╝\n\n⚠️ 𝗕𝗢𝗧 𝗖𝗥𝗔𝗦𝗛𝗘𝗗 / 𝗧𝗘𝗖𝗛𝗡𝗜𝗖𝗔𝗟 𝗜𝗦𝗦𝗨𝗘 ⚠️\n\n━━━━━━━━━━━━━━━━━━━━━━━\n🚨 𝗜𝗺𝗽𝗼𝗿𝘁𝗮𝗻𝘁 𝗡𝗼𝘁𝗶𝗰𝗲:\n• Bot abhi crash ho gaya hai, isliye koi bhi use mat karna! ❌\n• Abhi koi bhi user wallet mein amount add mat karna! 💸🚫\n• Jaise hi bot wapas sahi hoga, yahan bata diya jayega. ⏳✅\n━━━━━━━━━━━━━━━━━━━━━━━\n\n💬 𝗞𝗲𝘆𝘀 𝗞𝗵𝗮𝗿𝗶𝗱𝗻𝗶 𝗛𝗮𝗶?\nAgar aapko abhi key chahiye toh niche **Support** button se admin ko personal DM karein! 👇⚡`;

                await axios.post(`\${TELEGRAM_API}/sendMessage`, {
                    chat_id: chatId,
                    text: updateMessage,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "💬 Support / Personal DM", url: "https://t.me/ADITYACHOUDHARY5" }
                            ]
                        ]
                    }
                });
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook error:", error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port \${PORT}`);
});