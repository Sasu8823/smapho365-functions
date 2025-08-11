const PromptModel = require('../models/promptModel.js');

async function getPrompts(req, res) {
    const prompts = await PromptModel.getAllPrompts();
    res.json(prompts);
}

async function getPrompt(req, res) {
    const prompt = await PromptModel.getPromptById(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    res.json(prompt);
}

async function addPrompt(req, res) {
    const newPrompt = await PromptModel.createPrompt(req.body);
    console.log('New prompt created:', newPrompt);
    
    res.status(201).json(newPrompt);
}

async function editPrompt(req, res) {
    const updatedPrompt = await PromptModel.updatePrompt(req.params.id, req.body);
    res.json(updatedPrompt);
}

async function removePrompt(req, res) {
    const result = await PromptModel.deletePrompt(req.params.id);
    res.json(result);
}

module.exports = {
    getPrompts,
    getPrompt,
    addPrompt,
    editPrompt,
    removePrompt
};
