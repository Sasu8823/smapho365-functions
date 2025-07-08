// E: \LINE + ChatGPT\ smapho365\ functions\ index.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const vision = require('./vision');
const chatgpt = require('./chatgpt');
const utils = require('./utils');

// Set up Google Cloud credentials if needed
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const app = express();
app.use(cors({ origin: true }));

// Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Main analyze-image endpoint
app.post('/api/analyze-image', upload.single('photo'), async(req, res) => {
    console.time('analyze-image');
    try {
        // Logging
        console.log('=== photo ===', req.file);
        console.log('=== keywords ===', req.body.keywords);
        console.log('=== userProfile ===', req.body.userProfile);

        const photoFile = req.file;
        const keywords = req.body.keywords;
        let userProfile = {};
        try {
            userProfile = JSON.parse(req.body.userProfile || '{}');
        } catch (e) {
            console.error('userProfile parse error:', e);
            return res.status(400).json({ error: 'userProfileが不正です' });
        }

        // If neither photo nor keywords, return error
        if (!photoFile && !keywords) {
            return res.status(400).json({ error: '画像またはキーワードが必要です' });
        }

        // 1. Vision API: extract keywords from photo (if photo provided)
        let visionKeywords = [];
        if (photoFile) {
            try {
                visionKeywords = await vision.analyzeImage(photoFile.buffer);
            } catch (e) {
                console.error('Vision API error:', e);
                return res.status(500).json({ error: '画像解析に失敗しました。' });
            }
        }

        // Combine keywords from Vision and user input
        let allKeywords = [];
        if (keywords) {
            allKeywords = keywords.split(/[\s,、]+/).filter(Boolean);
        }
        allKeywords = [...new Set([...allKeywords, ...visionKeywords])].slice(0, 5);

        // 2. ChatGPT: generate messages
        let messages = [];
        try {
            messages = await chatgpt.generateMessages(allKeywords, userProfile);
        } catch (e) {
            console.error('ChatGPT API error:', e);
            return res.status(500).json({ error: 'メッセージ生成に失敗しました。' });
        }

        // Success response
        res.json({
            keywords: allKeywords,
            messages
        });
        console.timeEnd('analyze-image');
    } catch (err) {
        console.error('サーバーエラー:', err);
        res.status(500).json({ error: 'サーバーでエラーが発生しました。' });
        console.timeEnd('analyze-image');
    }
});

// Vision API direct endpoint (optional)
app.post('/api/vision', upload.single('photo'), async(req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '画像が必要です' });
        const keywords = await vision.analyzeImage(req.file.buffer);
        res.json({ keywords });
    } catch (err) {
        console.error('Vision API error:', err);
        res.status(500).json({ error: 'Vision APIエラー' });
    }
});

// ChatGPT direct endpoint (optional)
app.post('/api/chatgpt', express.json(), async(req, res) => {
    try {
        const { keywords, userProfile } = req.body;
        if (!keywords || !Array.isArray(keywords)) return res.status(400).json({ error: 'keywords配列が必要です' });
        const messages = await chatgpt.generateMessages(keywords, userProfile || {});
        res.json({ messages });
    } catch (err) {
        console.error('ChatGPT API error:', err);
        res.status(500).json({ error: 'ChatGPT APIエラー' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// For local development (optional)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Express server running at http://localhost:${PORT}`);
    });
}