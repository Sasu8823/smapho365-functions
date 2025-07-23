// functions/utils.js

const path = require("path");
const fs = require("fs");

/**
 * 画像ファイルの保存パスを生成
 * @param {string} userId - LINEユーザーIDなど
 * @param {string} fileName - オリジナルファイル名
 * @returns {string} - 保存先のファイルパス
 */
function getImageSavePath(userId, fileName) {
    const timestamp = Date.now();
    const sanitizedFile = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    return path.join(__dirname, "..", "tmp", `${userId}_${timestamp}_${sanitizedFile}`);
}

/**
 * 一時保存用ディレクトリを作成（なければ作る）
 */
function ensureTempDir() {
    const dir = path.join(__dirname, "..", "tmp");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * JSONレスポンスを送るためのヘルパー
 * @param {object} res - Expressのレスポンスオブジェクト
 * @param {number} statusCode - ステータスコード
 * @param {object} body - レスポンスボディ
 */
function sendJson(res, statusCode, body) {
    res.status(statusCode).json(body);
}

/**
 * Vision APIから抽出されたラベル配列を整形（最大5個）
 * @param {Array} labels - Vision APIのラベルオブジェクト
 * @returns {Array<string>} - 抽出されたキーワード文字列
 */
function extractKeywords(labels) {
    if (!Array.isArray(labels)) return [];
    return labels
        .slice(0, 5)
        .map(label => label.description)
        .filter(Boolean);
}

/**
 * ChatGPT用のプロンプト内に適したキーワード表現へ整形
 * @param {Array<string>} keywords
 * @returns {string}
 */
function formatKeywordsForPrompt(keywords) {
    return keywords.join("、");
}

function personalityPromptFromAnswers(answers) {
    const traits = [];

    if (answers.q1 === 'はい') traits.push("ユーモアがあり");
    if (answers.q2 === 'はい') traits.push("共感力が高く");
    if (answers.q3 === 'はい') traits.push("几帳面で");
    if (answers.q4 === 'はい') traits.push("思い出を大切にする");
    if (answers.q5 === 'はい') traits.push("時事に関心がある");
    if (answers.q6 === 'はい') traits.push("会話が少なく孤独を感じている可能性がある");
    if (answers.q7 === 'はい') traits.push("新しい技術に苦手意識がある");
    if (answers.q8 === 'はい') traits.push("家族とのつながりを大切にしている");
    if (answers.q9 === 'はい') traits.push("他人を気遣う優しい人");
    if (answers.q10 === 'はい') traits.push("季節の変化や行事に敏感");

    if (traits.length === 0) {
        return "この親御さんの傾向は不明です。";
    }

    return `この親御さんは、${traits.join("、")}ような傾向があります。`;
}



module.exports = {
    getImageSavePath,
    ensureTempDir,
    sendJson,
    extractKeywords,
    formatKeywordsForPrompt,
    personalityPromptFromAnswers
};