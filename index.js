// E: \LINE + ChatGPT\ smapho365\ functions\ index.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const vision = require('./vision');
const chatgpt = require('./chatgpt');
const utils = require('./utils');
const axios = require('axios');
const bodyParser = require('body-parser');
const db = require('./db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const promptRoutes = require('./routes/promptRoutes');
require('dotenv').config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/prompts', promptRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to set JWT as an HTTP-only cookie
function setAuthCookie(res, payload) {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('auth_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
}

// Middleware to verify JWT and protect routes
function authenticateToken(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: '認証が必要です' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: '無効なトークンです' });
        req.user = user;
        next();
    });
}

// Set up Google Cloud credentials if needed
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}


// Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Main analyze-image endpoint
app.post('/api/analyze-image', upload.single('photo'), async (req, res) => {
    console.time('analyze-image');
    try {
        const userId = req.body.userId; // LINE user ID expected
        const photoFile = req.file;
        const keywords = req.body.keywords;

        console.log('=== userId ===', userId);
        console.log('=== photo ===', req.file);
        console.log('=== keywords ===', req.body.keywords);

        let userProfile = {
            callingName: 'お母さん',
            tone: '普通',
            personality: ''
        };
        let answers = {};

        // --- 1. Fetch saved user profile if userId is present ---
        if (userId) {
            try {
                const conn = await db.getConnection();
                const [rows] = await conn.execute(`
                    SELECT calling_name, tone, personality, answers
                    FROM users
                    WHERE line_user_id = ?
                `, [userId]);
                conn.release();

                if (rows.length > 0) {
                    const row = rows[0];
                    userProfile.callingName = row.calling_name || userProfile.callingName;
                    userProfile.tone = row.tone || userProfile.tone;
                    userProfile.personality = row.personality || '';
                    if (row.answers) {
                        answers = JSON.parse(row.answers);
                        userProfile.personalityDescription = utils.personalityPromptFromAnswers(answers);
                    }
                }
            } catch (e) {
                console.warn('DBからのユーザープロフィール取得失敗:', e);
            }
        }

        // --- 2. Merge posted userProfile and answers if provided ---
        try {
            const postedProfile = JSON.parse(req.body.userProfile || '{}');
            const postedAnswers = JSON.parse(req.body.answers || '{}');
            userProfile = { ...userProfile, ...postedProfile };
            if (Object.keys(postedAnswers).length > 0) {
                answers = postedAnswers;
                userProfile.personalityDescription = utils.personalityPromptFromAnswers(answers);
            }
        } catch (e) {
            console.error('userProfile または answers のパースエラー:', e);
            return res.status(400).json({ error: 'userProfile または answers が不正です' });
        }

        // --- 3. Check input ---
        if (!photoFile && !keywords) {
            return res.status(400).json({ error: '画像またはキーワードが必要です' });
        }

        // --- 4. Vision API ---
        let visionKeywords = [];
        if (photoFile) {
            try {
                visionKeywords = await vision.analyzeImage(photoFile.buffer);
            } catch (e) {
                console.error('Vision API error:', e);
                return res.status(500).json({ error: '画像解析に失敗しました。' });
            }
        }

        // --- 5. Merge keywords ---
        let allKeywords = [];
        if (keywords) {
            allKeywords = keywords.split(/[\s,、]+/).filter(Boolean);
        }
        allKeywords = [...new Set([...allKeywords, ...visionKeywords])].slice(0, 8);

        // --- 6. ChatGPT message generation ---
        let messages = [];
        try {
            messages = await chatgpt.generateMessages(allKeywords, userProfile);
        } catch (e) {
            console.error('ChatGPT API error:', e);
            return res.status(500).json({ error: 'メッセージ生成に失敗しました。' });
        }

        // --- 7. Save generated messages to DB ---
        try {
            const conn = await db.getConnection();
            const saveQuery = `
            INSERT INTO Messages (message_text, created_at)
            VALUES (?, NOW())
            `;
            for (const msg of messages) {
                await conn.execute(saveQuery, [msg]);
            }
            conn.release();
            console.log("Messages saved to DB.");
        } catch (err) {
            console.error("Failed to save messages:", err);
        }

        // --- 8. Success response ---
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
app.post('/api/vision', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '画像が必要です' });
        const keywords = await vision.analyzeImage(req.file.buffer);
        res.json({ keywords });
    } catch (err) {
        console.error('Vision API error:', err);
        res.status(500).json({ error: 'Vision APIエラー' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    console.log('Request body:', req.body);
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '管理者名とパスワードを送ってください' });
    }

    try {
        const conn = await db.getConnection();
        const [rows] = await conn.execute(
            'SELECT id, username, password FROM admin WHERE username = ? LIMIT 1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: '認証に失敗しました' });
        }

        const admin = rows[0];
        // Hash input password with MD5
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

        if (hashedPassword !== admin.password) {
            return res.status(401).json({ success: false, message: '認証に失敗しました' });
        }

        // Login success — set cookie or token here
        setAuthCookie(res, { adminId: admin.id, adminName: admin.username, role: 'admin' });

        return res.json({ success: true, message: '管理者ログイン成功' });

    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ success: false, message: 'サーバーエラー' });
    }
});


app.get('/api/protected-route', authenticateToken, (req, res) => {
  res.json({ message: '認証済みユーザーのみアクセス可能', user: req.user });
});


app.post('/api/save-profile', express.json(), async (req, res) => {
    try {
        const { userProfile, answers } = req.body;

        if (!userProfile || !userProfile.callingName) {
            return res.status(400).json({ error: '不正なユーザープロフィールです' });
        }

        // Optional: validate or sanitize inputs
        const userId = req.body.userId; // if passed explicitly
        console.log('save-profile userId:', userId);

        // Save to DB
        const conn = await db.getConnection();

        const saveQuery = `
            INSERT INTO users (line_user_id, calling_name, age, tone, personality, answers, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                calling_name = VALUES(calling_name),
                age = VALUES(age),
                tone = VALUES(tone),
                personality = VALUES(personality),
                answers = VALUES(answers),
                updated_at = NOW()
            `;

        const result = await conn.execute(saveQuery, [
            userId,
            userProfile.callingName,
            userProfile.age || null,
            userProfile.tone,
            userProfile.personality || '',
            JSON.stringify(answers || {})
        ]);
        console.log('save-profile result:', result);
        conn.release();

        res.json({ status: 'success', updated: result[0].affectedRows });

    } catch (err) {
        console.error('/api/save-profile エラー:', err);
        res.status(500).json({ error: 'サーバーエラーにより保存に失敗しました' });
    }
});

app.post('/webhook', express.json(), async (req, res) => {
    const events = req.body.events;

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'image') {
            const replyToken = event.replyToken;
            const userId = event.source.userId;  //  Extract LINE userId

            console.log('LINE userId:', userId);

            try {
                // 1. Get image content from LINE
                const imageUrl = `https://api-data.line.me/v2/bot/message/${event.message.id}/content`;
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    }
                });

                // 2. Analyze the image
                const keywords = await vision.analyzeImage(Buffer.from(imageResponse.data));

                // 3. Retrieve saved user profile from DB
                let userProfile = {
                    callingName: 'お客様',
                    tone: '普通',
                    personality: ''
                };
                let answers = {};

                try {
                    const conn = await db.getConnection();
                    const [rows] = await conn.execute(`
                        SELECT calling_name, tone, personality, answers
                        FROM users
                        WHERE line_user_id = ?
                    `, [userId]);
                    conn.release();

                    if (rows.length > 0) {
                        const row = rows[0];
                        userProfile = {
                            callingName: row.calling_name || 'お客様',
                            tone: row.tone || '普通',
                            personality: row.personality || ''
                        };

                        if (row.answers) {
                            answers = JSON.parse(row.answers);
                            userProfile.personalityDescription = utils.personalityPromptFromAnswers(answers);
                        }
                    }
                } catch (err) {
                    console.warn('ユーザープロフィールの取得に失敗しました。初期設定を使用します。', err);
                }

                // 4. Generate ChatGPT messages
                const messages = await chatgpt.generateMessages(keywords, userProfile);

                //  (Optional) Save userId + keywords to DB here if needed

                // 4. Reply to user
                await axios.post('https://api.line.me/v2/bot/message/reply', {
                    replyToken,
                    messages: messages.slice(0, 3).map(m => ({ type: 'text', text: m }))
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                    }
                });

            } catch (err) {
                console.error('Error processing LINE image message:', err);
            }
        }
    }

    res.status(200).end();
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