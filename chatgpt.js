// functions/chatgpt.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = fs.readFileSync(
    path.join(__dirname, 'sample_message.txt'),
    'utf8'
);

async function generateMessages(keywords, userProfile = {}) {


    const userPrompt = `
    ■キーワード: ${keywords.join("、")}
    ■親の呼び名: ${userProfile.callingName || "お母さん"}
    ■年齢層: ${userProfile.age || "70代"}
    ■性格: ${[userProfile.personalityDescription, userProfile.personality].filter(Boolean).join("、")}
    ■話し方: ${userProfile.tone || "やわらかい口調"}
    `;
    console.log(userPrompt);
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        });

        const outputText = completion.choices[0].message.content;
        console.log("Generated messages:", outputText);

        // ChatGPTの出力が箇条書きなどの場合に備え、3文抽出
        const lines = outputText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !/^\s*(?:[A-Za-z]|Output|Messages?)[:：]/.test(line)) // filter out titles like "Output:"
            .map(line => line.replace(/^[\d\.\-・\s]+/, "")) // remove bullet points or numbers
            .slice(0, 3);

        return lines;
    } catch (error) {
        console.error("Error generating messages from ChatGPT:", error);
        return [
            "メッセージを生成できませんでした。",
            "しばらくしてから再度お試しください。",
            "申し訳ありません。",
        ];
    }
}

module.exports = { generateMessages };