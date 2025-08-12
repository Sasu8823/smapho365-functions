// routes/promptRoutes.js
const express = require('express');
const promptModel = require('../models/promptModel.js'); // <-- import model directly

const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await promptModel.getAllPrompts());
});
router.get('/:id', async (req, res) => {
  res.json(await promptModel.getPromptById(req.params.id));
});
router.post('/', async (req, res) => {
  res.json(await promptModel.createPrompt(req.body));
});
router.put('/:id', async (req, res) => {
  res.json(await promptModel.updatePrompt(req.params.id, req.body));
});
router.delete('/:id', async (req, res) => {
  res.json(await promptModel.deletePrompt(req.params.id));
});

module.exports = router;
