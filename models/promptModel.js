const db = require('../db.js');

async function getAllPrompts() {
    const [rows] = await db.query('SELECT * FROM prompts');
    return rows;
}

async function getPromptById(id) {
    const [rows] = await db.query('SELECT * FROM prompts WHERE id = ?', [id]);
    return rows[0];
}

async function createPrompt(data) {
    const { content } = data;
    const [result] = await db.query(
        'INSERT INTO prompts (content) VALUES (?, ?)',
        [content]
    );
    return { id: result.insertId, content };
}

async function updatePrompt(id, data) {
    const { content } = data;
    await db.query(
        'UPDATE prompts SET content = ? WHERE id = ?',
        [content, id]
    );
    return { id, content };
}

async function deletePrompt(id) {
    await db.query('DELETE FROM prompts WHERE id = ?', [id]);
    return { message: 'Prompt deleted' };
}

module.exports = {
    getAllPrompts,
    getPromptById,
    createPrompt,
    updatePrompt,
    deletePrompt
};
