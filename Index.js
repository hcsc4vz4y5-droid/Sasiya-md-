const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Web Panel එකේ files තියෙන public ෆෝල්ඩරය සම්බන්ධ කිරීම
app.use(express.static(path.join(__dirname, "public")));

// 🧠 බෝට්ගේ මතකය (User ලා සර්ච් කරන චිත්‍රපට තාවකාලිකව තබා ගැනීමට)
let userSession = {};

// වෙබ් පැනල් එකෙන් නම්බර් එක එවපුවාම Pairing Code එක දෙන API එක
app.get("/code", async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Number is required!" });

    num = num.replace(/[^0-9]/g, "");

    // 🔒 SECURITY CHECK: නම්බර් එක ඔයාගේ එක (94765530453) නෙමෙයි නම් Code එක දෙන්නේ නැහැ
    if (num !== "94765530453") {
        return res.json({ error: "Code generation failed!" });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState("./session");
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            browser: ["Mac OS", "Chrome", "101.0.4951.41"]
        });

        sock.ev.on("creds.update", saveCreds);

        // 📥 WhatsApp Messages සහ Commands කියවන කොටස
        sock.ev.on("messages.upsert", async (msg) => {
            const m = msg.messages[0];
            if (!m.message) return;
            
            const from = m.key.remoteJid;
            const messageType = Object.keys(m.message)[0];
            const body = messageType === 'conversation' ? m.message.conversation : 
                         messageType === 'extendedTextMessage' ? m.message.extendedTextMessage.text : '';
            
            const prefix = ".";
            const isCmd = body.startsWith(prefix);
            const command = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : '';

            // ------------------ COMMANDS MENU ------------------

            // 1. ALIVE COMMAND
            if (command === "alive") {
                await sock.sendMessage(from, { text: "👋 *SASIYA-MD IS ALIVE NOW!* \n\n🤖 *Version:* v1.0\n⚡ *Speed:* Super Fast\n🧑‍💻 *Owner:* Sasindu Thiwanka\nℹ️ Powered by SASIYA-MD" }, { quoted: m });
                return;
            }

            // 2. MENU COMMAND
            if (command === "menu" || command === "help") {
                let menuText = `✨ *SASIYA-MD BOT MENU* ✨\n\n`;
                menuText += `👨‍💻 *MAIN COMMANDS*:\n`;
                menuText += `• ${prefix}alive - Check if bot is online\n`;
                menuText += `• ${prefix}owner - Get owner details\n\n`;
                menuText += `📥 *DOWNLOAD COMMANDS*:\n`;
                menuText += `• ${prefix}yt [Link] - Download YouTube Video\n`;
                menuText += `• ${prefix}cinesubz [Name] - Search Movies from CineSubz\n\n`;
                menuText += `ℹ️ Powered by SASIYA-MD`;
                await sock.sendMessage(from, { text: menuText }, { quoted: m });
                return;
            }

            // 3. OWNER DETAILS COMMAND
            if (command === "owner") {
                await sock.sendMessage(from, { text: "🧑‍💻 *Bot Owner Info*:\n\n*Name:* SASINDU THIWANKA\n*Number:* 0765530453\n*WhatsApp:* wa.me/94765530453" }, { quoted: m });
                return;
            }

            // 4. YOUTUBE DOWNLOADER COMMAND (DOCUMENT MODE)
            if (command === "yt" || command === "youtube") {
                const args = body.slice(prefix.length + command.length).trim();
                if (!args) {
                    await sock.sendMessage(from, { text: "❌ කරුණාකර YouTube වීඩියෝ ලින්ක් එකක් ඇතුළත් කරන්න!\n\n💡 උදාහරණ: *.yt http://googleusercontent.com/youtube.com/5" }, { quoted: m });
                    return;
                }
                
                await sock.sendMessage(from, { text: `⏳ *SASIYA-MD Fetching YouTube Video...*` }, { quoted: m });
                
                try {
                    const apiUrl = `https://api.dreaded.site/api/ytdl?url=${encodeURIComponent(args)}`;
                    const apiResponse = await axios.get(apiUrl);
                    
                    const downloadUrl = apiResponse.data.result?.downloadLink || apiResponse.data.result?.url;
                    let videoTitle = apiResponse.data.result?.title || "YouTube_Video";
                    
                    videoTitle = videoTitle.replace(/[^a-zA-Z0-9]/g, "_");

                    if (!downloadUrl) {
                        await sock.sendMessage(from, { text: "This video not found" }, { quoted: m });
                        return;
                    }

                    const response = await axios({ method: 'get', url: downloadUrl, responseType: 'arraybuffer' });
                    const fileBuffer = Buffer.from(response.data, 'binary');

                    await sock.sendMessage(from, { 
                        document: fileBuffer, 
                        mimetype: 'video/mp4', 
                        fileName: `${videoTitle}_SASIYA_MD.mp4`,
                        caption: `🎬 *YOUTUBE DOCUMENT DOWNLOADER*\n\n📌 *Title:* ${videoTitle.replace(/_/g, " ")}\nℹ️ Powered by SASIYA-MD`
                    }, { quoted: m });

                } catch (err) {
                    await sock.sendMessage(from, { text: "This video not found" }, { quoted: m });
                }
                return;
            }

            // 5. CINESUBZ MOVIE INTERACTIVE SEARCH COMMAND
            if (command === "cinesubz") {
                const text = body.slice(prefix.length + command.length).trim();
                if (!text) {
                    await sock.sendMessage(from, { text: "❌ කරුණාකර සෙවිය යුතු චිත්‍රපටයේ නම ඇතුළත් කරන්න!\n\n💡 උදාහරණ: *.cinesubz Avatar*" }, { quoted: m });
                    return;
                }

                await sock.sendMessage(from, { text: `🔍 *SASIYA-MD Searching CineSubz for:* "${text}"...` }, { quoted: m });

                try {
                    const searchUrl = `https://cinesubz.co/?s=${encodeURIComponent(text)}`;
                    const response = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const $ = cheerio.load(response.data);
                    let results = [];

                    $("article").each((index, element) => {
                        const title = $(element).find(".entry-title a").text().trim() || $(element).find("h2").text().trim();
                        const link = $(element).find("a").attr("href");
                        
                        if (title && link && !link.includes("/tvshows/") && !link.includes("/episodes/")) {
                            if (results.length < 5) {
                                results.push({ title, link });
                            }
                        }
                    });

                    if (results.length === 0) {
                        await sock.sendMessage(from, { text: "❌ කිසිදු චිත්‍රපටයක් සොයා ගැනීමට නොහැකි විය. (TV Series මෙයට ඇතුළත් නොවේ)" }, { quoted: m });
                        return;
                    }

                    userSession[from] = {
                        step: "SELECT_MOVIE",
                        movies: results
                    };

                    let replyText = `🎬 *SASIYA-MD MOVIE LIST* 🎬\n\n`;
                    results.forEach((movie, i) => {
                        replyText += `${i + 1}. 🍿 *${movie.title}*\n`;
                    });
                    replyText += `\n💡 *කරුණාකර ඔබට අවශ්‍ය චිත්‍රපටයේ අංකය (උදා: 1) පමණක් reply කරන්න.*`;

                    await sock.sendMessage(from, { text: replyText }, { quoted: m });

                } catch (err) {
                    await sock.sendMessage(from, { text: "❌ තොරතුරු සෙවීමේදී දෝෂයක් ඇති විය!" }, { quoted: m });
                }
                return;
            }

            // --- අංකය ලැබුණාම ක්‍රියාත්මක වන කොටස (Interactive Response) ---
            if (userSession[from] && userSession[from].step === "SELECT_MOVIE" && !isCmd) {
                const selectedIndex = parseInt(body.trim()) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= userSession[from].movies.length) {
                    await sock.sendMessage(from, { text: "❌ වැරදි අංකයක්. කරුණාකර ලැයිස්තුවේ ඇති අංකයක් (1, 2..) පමණක් එවන්න." }, { quoted: m });
                    return;
                }

                const chosenMovie = userSession[from].movies[selectedIndex];
                delete userSession[from];

                let finalReply = `🍿 *SASIYA-MD DOWNLOAD LINK* 🍿\n\n`;
                finalReply += `🎬 *Movie:* ${chosenMovie.title}\n\n`;
                finalReply += `🔗 *මෙම ලින්ක් එකෙන් ගොස් බාගත කරගන්න:*\n${chosenMovie.link}\n\n`;
                finalReply += `ℹ️ Powered by SASIYA-MD`;

                await sock.sendMessage(from, { text: finalReply }, { quoted: m });
                return;
            }
        });

        // 🔔 බෝට් සාර්ථකව සම්බන්ධ වූ පසු ක්‍රියාත්මක වන කොටස
        sock.ev.on("connection.update", async (update) => {
            const { connection } = update;
            
            if (connection === "open") {
                console.log("SASIYA-MD Connected Successfully!");
                
                const myNumber = "94765530453@s.whatsapp.net";
                await sock.sendMessage(myNumber, { 
                    text: "🚀 *SASIYA-MD CONNECTED SUCCESSFULLY!*\n\n🤖 ඔයාගේ වට්සැප් බෝට් දැන් සක්‍රීයයි.\n💡 ඕනෑම චැට් එකක `.menu` ගහලා කමාන්ඩ්ස් බලන්න පුළුවන්." 
                });
            }
        });

        // Pairing Code එක Generate කර Web API එකට දීම
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                return res.json({ code: code });
            } catch (err) {
                return res.json({ error: "Code generation failed!" });
            }
        }, 3000);

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
