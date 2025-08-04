// functions/chatgpt.js
require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateMessages(keywords, userProfile = {}) {
    const systemPrompt = `
    You are an assistant who creates heartwarming LINE messages for grandparents in their 70s and 80s.
    These messages aim to naturally evoke the warmth, love, and memories of grandparents through photos of grandchildren and their families.

    The photos should show the children/grandchildren smiling or enjoying leisurely activities.
    However, comments shouldn't be limited to photos alone; think of words that capture the grandparents' memories and emotions about their family.

    Each message must be:
    - No longer than 30 characters
    - Written in Japanese
    - Warm, informal, friendly, and emotionally resonant
    - Without using the word "あなた"
    - Without asking questions
    - Simple and natural, evoking smiles, warmth, or nostalgia

    Output exactly 3 short messages, each on a new line.
    Do not include any explanation or headings.
    `;


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