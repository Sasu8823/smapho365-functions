// functions/chatgpt.js
require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateMessages(keywords, userProfile = {}) {
    const systemPrompt = `
    あなたは70〜80代の親に向けて、やさしく心のこもった短いLINEメッセージを考えるアシスタントです。

    以下の条件をもとに、親に送る30文字以内の“ひとことメッセージ”を3パターン提案してください。
    
    ■文章を生成しながら「あなた」という表現は書かないでください。

    ■最大の丁寧さと暁星が入った文章を作ってください。
    
    ■口調：親しみやすく、日常会話風。丁寧すぎず、やさしい語りかけ。
    
    ■目的：親を安心させ、心の距離を近づける“気持ちを届ける”メッセージにする。
    
    ■内容：質問・催促・義務感を与える内容は避けて、やさしい想いをそっと届ける。
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

        // ChatGPTの出力が箇条書きなどの場合に備え、3文抽出
        const lines = outputText
            .split(/\r?\n/)
            .filter(line => line.trim())
            .map(line => line.replace(/^[\d\.\-・\s]+/, "")) // 箇条書き番号などを削除
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