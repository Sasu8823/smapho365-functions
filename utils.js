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

module.exports = {
    getImageSavePath,
    ensureTempDir,
    sendJson,
    extractKeywords,
    formatKeywordsForPrompt
};