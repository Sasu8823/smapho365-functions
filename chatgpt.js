// functions/chatgpt.js
require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateMessages(keywords, userProfile = {}) {
    const systemPrompt = `
        You are an assistant who creates heartwarming LINE messages for grandparents in their 70s and 80s.
        The purpose of the message is to naturally bring back memories of the grandparents' kindness, love, and memories through images of their grandchildren and family.

        The photos should show the children (grandchildren) smiling or engaging in casual activities.
        However, rather than writing a comment that is limited to the photo, think of words that resonate with the grandparents' memories of those days and their feelings toward their family.

        Keep the message to 30 characters or less.

        Never usd "あなた"

        Avoid questions or pestering.

        Be warm, friendly, and leave a lasting impression.

        Use words that are conversational, gentle, and not overly polite.

        Naturally include images of children (grandchildren), smiles, growth, hands, and the atmosphere.

        Please make sentences in natural Japanese only.

        By doing this, you can create a message that opens up an emotional channel that will naturally elicit thoughts like, "My grandchild is so cute" and "He's growing up so well."
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