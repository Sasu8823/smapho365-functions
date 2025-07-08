// E:\LINE+ChatGPT\smapho365\functions\vision.js

// Google Cloud Vision API integration
// TODO: Set up Google Cloud Vision client
process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/vision-key.json';

const vision = require('@google-cloud/vision');
const { extractKeywords, sendJson } = require('./utils');

// Google Cloud Vision API クライアントを初期化
const client = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    // または直接APIキーを使用する場合:
    // apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
});

/**
 * 画像を分析してキーワード（ラベル）を抽出する
 * @param {Buffer} imageBuffer - 画像のバッファデータ
 * @returns {Promise<Array<string>>} - 抽出されたキーワード配列（最大5個）
 */
async function analyzeImage(imageBuffer) {
    try {
        // Vision APIに画像を送信してラベル検出を実行
        console.time('visionAPI');
        const [result] = await client.labelDetection(imageBuffer);
        console.timeEnd('visionAPI');
        const labels = result.labelAnnotations;

        // キーワードを抽出・整形
        const keywords = extractKeywords(labels);

        console.log('Vision API分析結果:', keywords);

        return keywords;
    } catch (error) {
        console.error('Vision API エラー:', error);
        throw new Error('画像の分析に失敗しました');
    }
}

/**
 * 画像URLからキーワードを抽出する（LINEからの画像URL用）
 * @param {string} imageUrl - 画像のURL
 * @returns {Promise<Array<string>>} - 抽出されたキーワード配列
 */
async function analyzeImageFromUrl(imageUrl) {
    try {
        // Vision APIに画像URLを送信してラベル検出を実行
        const [result] = await client.labelDetection(imageUrl);
        const labels = result.labelAnnotations;

        // キーワードを抽出・整形
        const keywords = extractKeywords(labels);

        console.log('Vision API分析結果 (URL):', keywords);

        return keywords;
    } catch (error) {
        console.error('Vision API エラー (URL):', error);
        throw new Error('画像の分析に失敗しました');
    }
}

/**
 * 画像の内容を詳細に分析する（オプション機能）
 * @param {Buffer} imageBuffer - 画像のバッファデータ
 * @returns {Promise<Object>} - 詳細な分析結果
 */
async function analyzeImageDetailed(imageBuffer) {
    try {
        // 複数の分析を並行実行
        const [labelResult, textResult, objectResult] = await Promise.all([
            client.labelDetection(imageBuffer),
            client.textDetection(imageBuffer),
            client.objectLocalization(imageBuffer)
        ]);

        const labels = labelResult[0].labelAnnotations;
        const text = textResult[0].textAnnotations;
        const objects = objectResult[0].localizedObjectAnnotations;

        return {
            keywords: extractKeywords(labels),
            text: text.length > 0 ? text[0].description : '',
            objects: objects.map(obj => obj.name).slice(0, 3)
        };
    } catch (error) {
        console.error('詳細分析エラー:', error);
        throw new Error('画像の詳細分析に失敗しました');
    }
}

module.exports = {
    analyzeImage,
    analyzeImageFromUrl,
    analyzeImageDetailed
};