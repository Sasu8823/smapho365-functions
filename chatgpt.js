// functions/chatgpt.js
require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateMessages(keywords, userProfile = {}) {
    const systemPrompt = `以下は70〜80代の親に向けた、LINEで送る親しみやすい短いメッセージを考えるタスクです。
- メッセージは日本語で書いてください。
- 文字数は50文字以内とします。
- 口調は親しみやすく、やさしい語りかけにしてください。
- 以下のキーワードと親の属性を参考にして、3つの異なるメッセージを提案してください。`;

    const userPrompt = `
■キーワード: ${keywords.join("、")}
■親の呼び名: ${userProfile.callingName || "お母さん"}
■年齢層: ${userProfile.age || "70代"}
■性格: ${userProfile.personality || "やさしい"}
■話し方: ${userProfile.tone || "やわらかい口調"}
`;

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